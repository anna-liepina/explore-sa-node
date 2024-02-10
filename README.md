[ci.tests-master-badge]: https://circleci.com/gh/anna-liepina/explore-sa-node/tree/master.svg?style=svg
[ci.tests-master]: https://circleci.com/gh/anna-liepina/explore-sa-node/tree/master
[ci.coverage-master-badge]: https://codecov.io/gh/anna-liepina/explore-sa-node/branch/master/graph/badge.svg
[ci.coverage-master]: https://codecov.io/gh/anna-liepina/explore-sa-node/branch/master

[ci.tests-heroku-badge]: https://circleci.com/gh/anna-liepina/explore-sa-node/tree/heroku.svg?style=svg
[ci.tests-heroku]: https://circleci.com/gh/anna-liepina/explore-sa-node/tree/heroku
[ci.coverage-heroku-badge]: https://codecov.io/gh/anna-liepina/explore-sa-node/branch/heroku/graph/badge.svg
[ci.coverage-heroku]: https://codecov.io/gh/anna-liepina/explore-sa-node/branch/heroku

|               | master                                                        | heroku
| ---           | ---                                                           | ---
| __tests__     | [![tests][ci.tests-master-badge]][ci.tests-master]            | [![tests][ci.tests-heroku-badge]][ci.tests-heroku]
| __coverage__  | [![coverage][ci.coverage-master-badge]][ci.coverage-master]   | [![coverage][ci.coverage-heroku-badge]][ci.coverage-heroku]

# 'Explore Me SA GraphqQL' [server applicaion]

This project is centered around parsing various datasets, including UK government data on property sales, police reporting data, and post code data. The goal is to harness geographical information to establish connections between postcodes using latitude and longitude.

The primary objective is to develop a scalable GraphQL backend capable of swiftly delivering requested results. This endeavor seeks to illuminate intricate aspects of GraphQL use, addressing challenges like the N+1 problem and scaling scenarios where more than one database is required for both write and read nodes.

Key features of the project include a robust automated Quality Assurance (QA) system, incorporating anonymized data seeding for comprehensive QA testing. The project also explores the flexibility of JavaScript, pushing the boundaries of the language. Notably, it delves into the constraints of default V8 object fields, which are capped at around ~8.4 million, while highlighting the superior handling capacity of the Map data structure.

Additionally, the project incorporates a queue system to enhance the efficiency of data processing. In essence, project serves as a practical demonstration of diverse and advanced aspects of software development, reflecting a commitment to excellence and innovation.

* GraphQL live [demo](https://graphql.exploreme.co.uk/) [currently unavailable]
* Web Application [example](https://github.com/anna-liepina/explore-cwa-react) of how data can be consumed
  * Web Application live [demo](https://exploreme.co.uk/) [currently unavailable]

### software requirements

if you're using `make` commands, __[docker](https://docs.docker.com/install/)__ and __[docker-compose](https://docs.docker.com/compose/install/)__ are required, and local __[node.js](https://nodejs.org/)__ with __[npm](https://www.npmjs.com/)__ are optional
* [node.js](https://nodejs.org/) v18+
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

### where to get data-sets
 * [UK postcodes](https://www.getthedata.com/open-postcode-geo)
 * [UK house sales data](https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads)
 * [UK LSOA & Postcode data](https://geoportal.statistics.gov.uk/datasets/ons::postcode-to-output-area-to-lower-layer-super-output-area-to-middle-layer-super-output-area-to-local-authority-district-november-2018-lookup-in-the-uk-2/about)
 * [Police Records Data](https://data.police.uk/data/archive/)

### how to install

* with `make` commands no steps additional are required, otherwise you need to execute `$ npm i`

### how to run tests

* `$ make test` or `$ npm test`
  * __optional__ [ 'jest' CLI params](https://facebook.github.io/jest/docs/en/cli.html), examples:
    * to collect coverage, example: `$ npm test -- --coverage`, report will be located in __./coverage__ directory
    * to execute tests __only__ in a specific file, for example: `$ npm test src/graphql/user.test.js`

### how to set up a database

* database configuration is located in the file __src/orm-config.js__
* to get database schema up to date: `$ npm run sql db:migrate`, you can also create a database via ORM `npm run sql db:create`
* to seed the database with 'test' data: `$ npm run sql db:seed:all`

### how to run in 'development' mode

* `$ make` or `$ npm start`

### how to run in 'production' mode

* `$ make serve`, there is no *npm* equivalent
* if you __only__ need to generate static assets
  * `$ make build` or `$ npm run build` - generated assets will be located in __./build__ directory

### how to run containers with different variables using 'make'

* `make PORT=18081`

### gitflow

* *heroku* -> current __production__, contains *production specific changes*, trigger production deploment on *every push*
* *master* -> most upto date __production ready__, all pull requests in to this branch got mandatory check 'ci/circleci: jest'
* *feature branches* -> get merged into the master branch when they are ready and mandatory checks passed
* *CI executes tests in an isolated environment*

### used environment variables

| Variable            | Default Value | Type      | Description
| ---                 | ---           | ---       | ---
| PORT                | 8081          | number    | The port on which the application will be available.
| SSL_KEY             |               | string    | The absolute path to the SSL key (e.g., `/home/ubuntu/private.key`).
| SSL_CERT            |               | string    | The absolute path to the SSL certificate (e.g., `/home/ubuntu/certificate.crt`).
| ***                 | ***           | ***       | If a replica's config is specified, non-replica connections are used only for writes.
| DB_HOSTNAME         | 127.0.0.1     | string    | The host on which the database can be reached.
| DB_USERNAME         | root          | string    | The username for connecting to the database.
| DB_PASSWORD         | password      | string    | The password for the database user.
| DB_PORT             | 3306          | number    | The port on which the database can be reached.
| DB_NAME             | explore       | string    | The name of the database schema.
| DB_DIALECT          | mysql         | string    | The database dialect, one of mysql / sqlite / postgres.
| DB_REPLICA_HOSTNAME | 127.0.0.1     | string    | The host of the database replica for read-only operations.
| DB_REPLICA_USERNAME | root          | string    | The username for connecting to the database replica for read-only operations.
| DB_REPLICA_PASSWORD | password      | string    | The password for the user connecting to the database replica for read-only operations.


### data processors

| NPM command            | corresponding JS file
| ---                    | ---
| `parse:postcodes`      | `src/parse:postcodes`
| `parse:postcodes:lsoa` | `src/parse:postcodes:lsoa`
| `parse:incidents`      | `src/parse:markers:and:incidents`
| `parse:properties`     | `src/parse:markers:and:properties`
| `parse:areas`          | `src/parse:areas`
| `parse:timelines`      | `src/parse:timelines`

example: `npm run parse:postcodes -- --file=/media/data/postcodes.csv`

### supported databases

| database      | version   | adapter                                           | main purpose
| ---           | ---       | ---                                               | ---
| MySQL         | 8         | [mysql2](https://www.npmjs.com/package/mysql2)    | production
| PostgreSQL    | 11        | [pg](https://www.npmjs.com/package/pg)            | production
| SQLite        | 4         | [sqlite3](https://www.npmjs.com/package/sqlite3)  | QA Automation & CI

* if you use MySQL 5.7+ you need to make sure it can work with [mysql native password](https://medium.com/@crmcmullen/how-to-run-mysql-8-0-with-native-password-authentication-502de5bac661)

* PostrgeSQL and SQLite are partially supported because some of the queries are not fully engine-agnostic, and some functions do not exist in SQLite for example
