Living Model
============

A demonstration of the Living Model concept where a client-side web application provides an interactive and visual modeling interface, and is coupled to a server-side web application designed to fetch, process, and manage input datasets retrieved using web services.

This project is part of a PhD research by Jeffrey D. Walker, Tufts University. For more information about this research, see http://phd.walkerjeff.com

## Code Overview

This repository contains the following:

- `static-src/` the front-end and source code for the client-side web application built with backbone.js and require.js
- `templates/` view templates used by the server-side flask application
- `app.py` main server-side application file developed using flask
- `settings_default.py` a default settings file used to configure the secret key of the application (see Settings File below)
- `requirements.txt` pip requirements file for obtaining the python dependencies

## Dependencies

The server-side application requires a set of python packages listed in the `requirements.txt` file. Use pip to install these packages:

    pip install -r requirements.txt

Require.js is used to optimize (i.e. uglify, minimify, concat) the client-side source code. The optimization configuration is deifned in the /static-src/js/app.build.js file. 

Node is required, which can be downloaded here: http://nodejs.org/

## Settings File

You must also create a settings.py file using the setting_default.py example file:

    cp settings_default.py settings.py

Open the settings.py file in a text editor and set the secret key (see the (Flask Quick Start)[http://flask.pocoo.org/docs/quickstart/#sessions] for info on generating a randomized secret key), a user email, and a password. The email and password are used to create a User account for the Admin page and Database API.

## Building

Before running the application, you must build the client-side application files, which are located in `static-src/`.

Assuming node.js is installed and the r.js file is located in the root directory, run this command:

    node r.js -o ../../static-src/js/app.build.js

This will run in the require.js optimizer and place the built client-side code in the `static/` folder, which is used by the flask application.

## Creating A Sample Database

To create a sample database that will contain four example watersheds, run this command which executes the `build_sample_db()` function in `app.py`:

    python app.py db

## Development Server

After building the client-side application code and creating the settings.py file, you can run the application locally by:

    python app.py
