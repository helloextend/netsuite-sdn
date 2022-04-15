<p align="center">
  <img src="https://helloextend-static-assets.s3.amazonaws.com/extend-shield-logo.png" />
  <h1 align="center">Extend Netsuite SDK</h1>
</p>

This repository serves as a quick start for anyone who is integrating with Extend services out of Netsuite. This is packaged as a SuiteCloud Development Account Customization and can be deployed in minutes with the SuiteCloud Node.js CLI.

# Getting Started
## Prerequisites
- Node.js
- [SuiteCloud CLI](https://github.com/oracle/netsuite-suitecloud-sdk/tree/master/packages/node-cli)
- Extend [Demo](https://demo.merchants.extend.com/login) or [Production](https://merchants.extend.com/login) store

## Installation
Clone the repo to your machine:
```
git clone https://github.com/helloextend/netsuite-sdk.git
```
## Setup Authentication ID
Run the suitecloud configuration command (see `package.json` scripts):
```
npm run config
```
This will trigger the `account:setup` menu where you will select or configure an authentication id (authId) for the Netsuite instance you wish to deploy to. You should see the below prompt:
```
> suitecloud account:setup -i

? Select or create an authentication ID (authID, a custom alias you give to a specific account-role combination):

***The authentication ID that you select or create will be set up as default. (Use arrow keys)

❯ Create a new authentication ID (authID).
```
## Deployment
Once you have configured your connection to the Netsuite instance, you are ready to deploy the account customization. Run the `build-deploy` command to add dependencies, validate the project against the account, and deploy:
```
npm run build-deploy
```
You will see all the project objects in the target account once the deployment succesfully completes.

# Extras
## Simplified SuiteCloud CLI Commands
Command | Description
------- | -----------
`npm run config` | Runs the `account:setup` command to allow you to setup or select an authID
`npm run build-deploy` | Runs the `adddependencies`, `validate`, and `deploy` commands to quickly deploy with all validations in place
`npm run deploy` | Runs the `deploy` command to quickly deploy changes
`npm run upload` | Runs the `file:upload` command to update a single script file in the file cabinet
`npm run update` | Runs the `object:update` command to update a single object like a custom record or script deployment
