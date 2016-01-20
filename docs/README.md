# chaos-orm

[![Build Status](https://travis-ci.org/crysalead-js/chaos-orm.png?branch=master)](https://travis-ci.org/crysalead-js/chaos-orm)
[![Coverage Status](https://coveralls.io/repos/crysalead-js/chaos-orm/badge.svg)](https://coveralls.io/r/crysalead-js/chaos-orm)

Chaos is an independent, persistence-agnostic layer responsible for defining entities' business logic and relationships. It allows to describe a [Domain Model](https://en.wikipedia.org/wiki/Domain_model) without any assumption about the persistence layer.

Already available persistant layers:

* [MySQL](https://github.com/crysalead-js/chaos-mysql)
* [PostgreSQL](https://github.com/crysalead-js/chaos-postgresql)
* [Sqlite](https://github.com/crysalead-js/chaos-sqlite)

Since Chaos contains all persistence-agnostic logic like relationships, eager/lazy loading, validations, etc. it dramatically simplify the developpment of datasources libraries.

As long as the datasource you envisionned to use is able to fetch a record/document thanks to a unique identifier (i.e no composite primary key), creating a persistant layer for Chaos will be trivial.

## Install

```bash
npm install chaos-orm
```

## Main Features

* Support eager loading
* Support nested saving
* Support external & embedded relationship
* Support custom types & entities' field casting

## Example of syntax:

```js
import co from 'co';
import Image from './model/Images';

co(function* () {
  // Adding a many-to-many relation
  var image = yield Image.load(123, { 'embed': 'tags' });
  image.push({ name: 'Landscape' });
  yield image.save();
  image.tags.forEach(function(tag) {
    console.log(tag.get('name'));
  }); // Echoes: 'Montain', 'Black&White', 'Landscape'
});
```

## Documentation

See the whole [documentation here](http://chaos-orm.readthedocs.org/en/latest).

### Testing

The spec suite can be runned with:

```
cd chaos-orm
npm install
npm test
```

## Documentation

Important: in the following documentation [chaos-pgsql](https://github.com/crysalead-js/chaos-pgsql) is used to illustrate examples. So don't forget to run `composer require crysalead-js/chaos-pgsql` in your project before poking around examples.

* [Connections](connections.md)
* [Models](models.md)
  * [Definition](models.md#definition)
  * [Schema](models.md#schema)
  * [Entities](models.md#entities)
  * [Validations](models.md#validations)
  * [Querying](models.md#Querying)
    * [Querying methods](models.md#querying_methods)
    * [Fetching methods](models.md#fetching_methods)
    * [Scopes](models.md#Scopes)
    * [Global scope](models.md#global_scope)
    * [Querying shortcuts](models.md#querying_shortcuts)
  * [Getters/Setters](models.md#getters_getters)
* [Entities](entities.md)
  * [Creation](entities.md#creation)
  * [CRUD Actions](entities.md#crud)
  * [Additional Methods](entities.md#methods)
* [Schemas](schemas.md)
  * [Overview](schemas.md#overview)
  * [Fields](schemas.md#fields)
  * [Relations](schemas.md#relations)
  * [Formatters](schemas.md#formatters)
  * [Custom types](schemas.md#types)
  * [Additionnal Methods](schemas.md#methods)
