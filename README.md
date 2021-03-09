# Discord.js Extra
This provides a set of utilities for the Discord.js library. You can find a full list of the features below, with examples and documentation.  

# Installation
The only thing that is required for this to work is the `discord.js` library.
`npm i -s discord.js`  
`npm i -s djs-extra`  

# Documentation
This is a step by step walkthrough of the features that `djs-extra` provides.  

## Parameter Parsing
CommonJS Import `const params = require('djs-extra/params');`  
ESM Import `import params from 'djs-extra/params';`  

### Lexer
Splits some text into a name, list of raw arguments, and the remaining text.  
```ts
function lex(text: string): {
	name: string,
	items: string[],
	text: string
}
```

### Parser
Executes the parameters with a given set of usages and calls the matching function. If an error occurred, info will be passed to the error handler.  
```ts
function parse(
	items: string[],
	text: string,
	client: Client,
	guild: Guild,
	usages: Record<string, Function>,
	success: Function,
	error: Function
)
```

### Parameter Object
This is what you get for every flag and parameter that is parsed. Each helper returns `null` if invalid.  

```ts
function error(type: string, subtype: string, item: any) {} // Calls the error handler.  
function text(): string {} // Returns the raw text.
function usage(): string {} // Returns the usage text.
function name(): string {} // Returns the parameter name.
function string(): string {} // Returns a parsed string.
function id(): string {} // Returns a Discord snowflake.
function channel(...types: string[]): Channel {} // Returns a channel object.
function message(channel: Channel): Promise<Message> {} // Returns a message object.
function emoji(): Emoji {} // Returns an emoji object.
function member(): Promise<GuildMember> {} // Returns a member object.
function user(): Promise<User> {} // Returns a user object.
function role(): Promise<Role> {} // Returns a role object.
function boolean(): boolean {} // Returns a boolean.
function number(min: number, max: number): number {} // Returns a number.
function integer(min: number, max: number): number {} // Returns an integer.
function exists(): boolean {} // Checks if the parameter is not empty.
function empty(): boolean {} // Checks if the parameter is empty.
```

### Usage Syntax
`-flag` Optional boolean flag.  
`[example]` Optional item.  
`[example...]` Optional remainder of text.  
`<example>` Required item.  
`<example...>` Required remainder of text.  
`some|other` Specific options.  

### Example
This is an example usage of the parameter system.  
```ts
// Dependencies
const { Client, Intents } = require('discord.js');
const { lex, parse } = require('djs-extra/params');
const { token } = require('./config.json');

// Client
const client = new Client({ ws: { intents: Intents.ALL } });

// Ready Message
client.once('ready', () => console.log('The parameter testing bot is now online!'));

// Command Handler
client.on('message', async message => {

	// Validate
	if (message.author.bot || message.guild === null) return;

	// Check Prefix
	let text = message.content;
	if (!text.startsWith('!')) return;
	text = text.slice(1).trimLeft();

	// Apply Lexer
	const result = lex(text);
	if (result === undefined) return;

	// Check Command
	if (result.name === 'help') {

		// Apply Parser
		const output = await parse(result.items, result.text, client, message.guild, {

			// Usage
			'[category]': async category => {

				// Execute Command
				if (category.exists()) {
					category = category.string();
					await message.channel.send(`Category: ${category}`);
				} else {
					await message.channel.send('No category.');
				}

				// Return Something
				return 'Successfully executed command!';

			}

		});

		// Log Result
		console.log(output);

	}
});

// Discord Login
client.login(token);
```