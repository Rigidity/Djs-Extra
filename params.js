exports.lex = function lex(text) {
	const items = text.match(/[^\s\\"]+|"(?:[^"\\]|\\["\\])*"/g) ?? [];
	if (items.length === 0) return null;
	const name = items.shift();
	if (name.startsWith('"') && name.endsWith('"')) return null;
	text = text.slice(name.length).trimLeft();
	return { name, items, text };
}

exports.parse = function parse(items = [], text = '', client = null, guild = null, usages = {}, success = (handler, ...args) => handler(...args), error = (usage, name, text, type, subtype, item, helper) => {}) {
	const arg = (usage, name, text) => {
		const helper = {
			error: (type, subtype, item) => error(usage, name, text, type, subtype, item, helper),
			text: () => text,
			usage: () => usage,
			name: () => name,
			string: () => text.startsWith('"') && text.endsWith('"') ? text.slice(1, -1).replace(/\\([\\"])/g, '$1') : text,
			id: () => {
				if (!/[0-9]{17,19}/.test(text)) return null;
				else return text;
			},
			channel: (...types) => {
				if (guild === null) throw new Error('Cannot fetch channels without a guild.');
				let result;
				if (/^[0-9]{17,19}$/.test(text)) result = guild.channels.cache.get(text);
				else if (/^<#[0-9]{17,19}>$/.test(text)) result = guild.channels.cache.get(text.slice(2, -1));
				else result = guild.channels.cache.find(channel => channel.name === text);
				if (result === undefined) return null;
				if (types.length > 0 && !types.includes(result.type)) return null;
				else return result;
			},
			message: async channel => {
				let result;
				if (/^[0-9]{17,19}$/.test(text)) try { result = await channel.messages.fetch(text) } catch {}
				else if (/^<#[0-9]{17,19}>$/.test(text)) try { result = await channel.messages.fetch(text.slice(2, -1)) } catch {}
				if (result === undefined) return null;
				else return result;
			},
			emoji: () => {
				if (guild === null) throw new Error('Cannot fetch emojis without a guild.');
				let result;
				if (/^[0-9]{17,19}$/.test(text)) result = guild.emojis.cache.get(text);
				else if (/^<#[0-9]{17,19}>$/.test(text)) result = guild.emojis.cache.get(text.slice(2, -1));
				else result = guild.emojis.cache.find(emoji => emoji.name === text);
				if (result === undefined) return null;
				else return result;
			},
			member: async () => {
				if (guild === null) throw new Error('Cannot fetch members without a guild.');
				let result;
				if (/^[0-9]{17,19}$/.test(text)) try { result = await guild.members.fetch(text) } catch {}
				else if (/^<#[0-9]{17,19}>$/.test(text)) try { result = await guild.members.fetch(text.slice(2, -1)) } catch {}
				else result = guild.members.cache.find(member => member.user.tag === text) ?? guild.members.cache.find(member => member.nickname ?? member.user.username === text) ?? guild.members.cache.find(member => member.user.username === text);
				if (result === undefined) return null;
				else return result;
			},
			user: async () => {
				if (client === null) throw new Error('Cannot fetch users without a client.');
				let result;
				if (/^[0-9]{17,19}$/.test(text)) try { result = await client.users.fetch(text) } catch {}
				else if (/^<#[0-9]{17,19}>$/.test(text)) try { result = await client.users.fetch(text.slice(2, -1)) } catch {}
				else result = client.users.cache.find(member => member.user.tag === text) ?? guild.members.cache.find(member => member.user.username === text);
				if (result === undefined) return null;
				else return result;
			},
			role: async () => {
				if (guild === null) throw new Error('Cannot fetch roles without a guild.');
				let result;
				if (/^[0-9]{17,19}$/.test(text)) try { result = await guild.roles.fetch(text) } catch {}
				else if (/^<#[0-9]{17,19}>$/.test(text)) try { result = await guild.roles.fetch(text.slice(2, -1)) } catch {}
				else result = guild.roles.cache.find(role => role.name === text);
				if (result === undefined) return null;
				else return result;
			},
			boolean: () => {
				const result = text.toLowerCase();
				if (['true', 'yes'].includes(result)) return true;
				else if (['false', 'no'].includes(result)) return false;
				else return null;
			},
			number: (min, max) => {
				if (!/[+\-]?(?:[0-9]*\.[0-9]+|[0-9]+)/.test(text)) return null;
				const result = +text;
				if (isNaN(result) || result === -Infinity || result === Infinity) return null;
				if (min !== undefined && max === undefined && result < min) return null;
				else if (max !== undefined && min === undefined && result > max) return null;
				else if (min !== undefined && max !== undefined && (result < min || result > max)) return null;
				else return result;
			},
			integer: (min, max) => {
				if (!/[+\-]?[0-9]+/.test(text)) return null;
				const result = +text;
				if (isNaN(result) || result === -Infinity || result === Infinity) return null;
				if (min !== undefined && max === undefined && result < min) return null;
				else if (max !== undefined && min === undefined && result > max) return null;
				else if (min !== undefined && max !== undefined && (result < min || result > max)) return null;
				else return result;
			},
			exists: () => text.length !== 0,
			empty: () => text.length === 0
		}
		return helper;
	}
	let finalError;
	usages: for (const [usageText, callback] of Object.entries(usages).reverse()) {
		const itemsCopy = items.slice();
		let textCopy = text;
		const usage = usageText.match(/<[a-z0-9\-]+(?:\.\.\.)?>|\[[a-z0-9\-]+(?:\.\.\.)?\]|\-?[a-z0-9\-]+(?:\|[a-z0-9\-]+)*|\.\.\./g);
		const args = [];
		for (const param of usage) {
			if (param === '...') {
				textCopy = '';
				itemsCopy.length = 0;
			} else if (param.startsWith('-')) {
				args.push(arg(usageText, param.slice(1), itemsCopy[0]?.toLowerCase() === param ? 'true' : 'false'));
				if (itemsCopy.length > 0) textCopy = textCopy.slice(itemsCopy.shift().length).trimLeft();
			} else if (!param.startsWith('[') && !param.startsWith('<')) {
				const options = param.split('|');
				const name = itemsCopy[0]?.toLowerCase();
				if (options.includes(name)) args.push(arg(usageText, name, name));
				else {
					finalError = [usageText, '', name, 'unmatched', 'option'];
					continue usages;
				}
				if (itemsCopy.length > 0) textCopy = textCopy.slice(itemsCopy.shift().length).trimLeft();
			} else {
				const optional = param.startsWith('[');
				const spread = param.endsWith(optional ? '...]' : '...>');
				const name = param.slice(1, spread ? -4 : -1);
				const item = spread ? textCopy : (itemsCopy[0] ?? '');
				if (item.length === 0 && !optional) {
					finalError = [usageText, name, '', 'unmatched', 'parameter'];
					continue usages;
				}
				args.push(arg(usageText, name, item));
				if (spread) {
					textCopy = '';
					itemsCopy.length = 0;
				} else if (itemsCopy.length > 0) textCopy = textCopy.slice(itemsCopy.shift().length).trimLeft();
			}
		}
		if (textCopy.length > 0) {
			finalError = [usageText, '', '', 'invalid', 'arguments'];
			continue;
		}
		args.push(itemsCopy, textCopy);
		return success(callback, ...args);
	}
	if (finalError !== undefined) error(...finalError);
}