# Housekeeper

A web application that helps with storing and monitoring energy consumptions of real estates.

## Installation and usage

Install the latest versions of _Node.js_ (together with _npm_) on your system. Copy the files from the `src` directory to the directory of your choice. Navigate to the selected directory and issue the following command.

    npm install

Take a look at the `config.json` file. Specify the path where you would like to store the database. After that you can start the server by executing the `npm start` command. Visit the `/install` URL first and add the categories you would like to use, separated by a comma with the unit of measurement in paranthesis after each. Note that currently exactly 3 categories are supported.

## Development environment

  * Ubuntu 14.04
  * Node.js 6.2.0
  * npm 3.8.9
  * Visual Studio Code 1.1.1
  * jslint 0.9.6
