[ci.tests-master-badge]: https://circleci.com/gh/anna-liepina/explore-sa-node/tree/master.svg?style=svg
[ci.tests-master]: https://circleci.com/gh/anna-liepina/explore-sa-node/tree/master
[ci.coverage-master-badge]: https://codecov.io/gh/anna-liepina/explore-sa-node/branch/master/graph/badge.svg
[ci.coverage-master]: https://codecov.io/gh/anna-liepina/explore-sa-node/branch/master

[ci.tests-heroku-badge]: https://circleci.com/gh/anna-liepina/explore-sa-node/tree/heroku.svg?style=svg
[ci.tests-heroku]: https://circleci.com/gh/anna-liepina/explore-sa-node/tree/heroku
[ci.coverage-heroku-badge]: https://codecov.io/gh/anna-liepina/explore-sa-node/branch/heroku/graph/badge.svg
[ci.coverage-heroku]: https://codecov.io/gh/anna-liepina/explore-sa-node/branch/heroku

|               | master                                                        | heroku
|---            |---                                                            | ---
| __tests__     | [![tests][ci.tests-master-badge]][ci.tests-master]            | [![tests][ci.tests-heroku-badge]][ci.tests-heroku]
| __coverage__  | [![coverage][ci.coverage-master-badge]][ci.coverage-master]   | [![coverage][ci.coverage-heroku-badge]][ci.coverage-heroku]

##### THIS IS A SPARE TIME PROJECT, WORK IN PROGRESS! [DEMO](https://sa-explorer.herokuapp.com/)

# 'Explorer' GraphQL back-end

front-end can be found [here](https://github.com/anna-liepina/explore-cwa-react)
[DEMO](http://ec2-35-179-94-68.eu-west-2.compute.amazonaws.com:8081/graphql)

### software requirements

if you're using `make` commands, __[docker](https://docs.docker.com/install/)__ and __[docker-compose](https://docs.docker.com/compose/install/)__ are required, and local __[node.js](https://nodejs.org/)__ with __[npm](https://www.npmjs.com/)__ are optional
* [node.js](https://nodejs.org/) v14+
* [npm](https://www.npmjs.com/) v5+ or [yarn](https://yarnpkg.com/)
* __optional__ [makefile](https://en.wikipedia.org/wiki/Makefile) comes out of the box in *unix* enviroments
* __optional__ [docker](https://www.docker.com/) v18.09+
* __optional__ [sqlite3](https://www.sqlite.org/index.html) v3+ *for 'integration' tests only*

### used technologies

* [apollo server](https://www.apollographql.com/docs/apollo-server/)
* [express.js](https://expressjs.com/)
* [sequlize](http://docs.sequelizejs.com/)
* [dataloader](https://github.com/graphql/dataloader)
* [graphql](https://graphql.org/)
* [jest](https://facebook.github.io/jest/)

### used services

* [circle ci](https://circleci.com/dashboard)
* [codecov](https://codecov.io/)
* [code climate](https://codeclimate.com/)
* [snyk](https://snyk.io/)
* [heroku](https://www.heroku.com/)

### where to get data-sets
 * [UK Postcodes](https://www.freemaptools.com/download-uk-postcode-lat-lng.htm)
 * [UK house sales data](https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads)

### how to install

* with `make` commands no steps additional required, otherwise you need execute `$ npm i`

### how to run tests

* `$ make test` or `$ npm test`
  * __optional__ [ 'jest' CLI params](https://facebook.github.io/jest/docs/en/cli.html), examples:
    * to collect coverage, example: `$ npm test -- --coverage`, report will be located in __./coverage__ directory
    * to execute tests __only__ in specific file, example: `$ npm test src/graphql/user.test.js`

### how to setup a database

* database configuration is located in the file __src/orm-config.js__
* to get database schema up to date: `$ npm run sql db:migrate`, you can also create database via ORM `npm run sql db:create`
* to seed database with 'test' data: `$ npm run sql db:seed:all`

### how to run in 'development' mode

* `$ make` or `$ npm start`

### how to run in 'production' mode

* `$ make serve`, there is no *npm* equivalent
* if you __only__ need to generate static assets
  * `$ make build` or `$ npm run build` - generated assets will be located in __./build__ directory

### how to run containers with different variables using 'make'

* example: `make PORT=18081`

### gitflow

* *heroku* -> current __production__, contains *heroku specific changes*, trigger deploy on heroku on *every push*
* *master* -> most upto date __production ready__, all pull requests in to this branch got mandatory check 'ci/circleci: jest'
* *feature branches* -> get merged into master branch, when they ready and mandatory checks passed
* *CI execute tests in isolated enviroment*


### used environment variables

| variable            | default value | used as   | purpose
|---                  |---            |---        | ---
| PORT                | 8081          | number    | port on which application will be made available
| SSL_KEY             |               | string    | absolute path to the SSL key, example: `/home/ubuntu/server.key`
| SSL_CERT            |               | string    | absolute path to the SSL certificate, example: `/home/ubuntu/server.key`
| ***                 | ***           | ***       | if replica's config specified then used only for writes
| DB_HOSTNAME         | 127.0.0.1     | string    | host on which database can be reached
| DB_USERNAME         | root          | string    | database user
| DB_PASSWORD         | password      | string    | database user's password
| DB_PORT             | 3306          | number    | port on which database can be reached
| DB_NAME             | explore       | string    | database [schema] name
| DB_DIALECT          | mysql         | string    | database's dialect: one of mysql / sqlite / postgres
| DB_REPLICA_HOSTNAME | 127.0.0.1     | string    | database replica's host for read-only
| DB_REPLICA_USERNAME | root          | string    | database replica's user for read-only
| DB_REPLICA_PASSWORD | password      | string    | database replica's user's password for read-only

### supported databases

code, migrations, and fixtures are written in a way, that is supports 3 different database engines

| database      | version   | adapter                                           | main purpose
|---            |---        | ---                                               | ---
| MySQL*        | 8         | [mysql2](https://www.npmjs.com/package/mysql2)    | local development
| PostgreSQL**  | 11        | [pg](https://www.npmjs.com/package/pg)            | 'heroku' deployment
| SQLite**      | 4         | [sqlite3](https://www.npmjs.com/package/sqlite3)  | QA Automation & CI pipelines
* if you use MySQL 5.7+ you need make sure it can work with (mysql native password)[https://medium.com/@crmcmullen/how-to-run-mysql-8-0-with-native-password-authentication-502de5bac661].
** PostrgeSQL and SQLite is partially supported
