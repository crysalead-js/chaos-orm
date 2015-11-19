# chaos-orm

[![Build Status](https://travis-ci.org/crysalead-js/chaos-orm.png?branch=master)](https://travis-ci.org/crysalead-js/chaos-orm)
[![Coverage Status](https://coveralls.io/repos/crysalead-js/chaos-orm/badge.svg)](https://coveralls.io/r/crysalead-js/chaos-orm)

Chaos is an independent, persistence-agnostic layer responsible for defining entities' business logic and relationships. It allows to describe a [Domain Model](https://en.wikipedia.org/wiki/Domain_model) without any assumption about the persistence layer.

Available datasources libraries:

* [MySQL](https://github.com/crysalead-js/chaos-mysql)
* [PostgreSQL](https://github.com/crysalead-js/chaos-postgresql)
* [Sqlite](https://github.com/crysalead-js/chaos-sqlite)

Chaos dramatically simplify the developpment of a datasources libraries by providing all persistence-agnostic logic like relationships, eager loading at the root level. The only requirement is the datasource you envisionned to use need to be able to fetch a record/document thanks to a unique identifier (i.e no composite primary key).

## Community

To ask questions, provide feedback or otherwise communicate with the team, join us on `#chaos` on Freenode.

## Requirements

 * PHP 5.5+

## Main Features

* Support eager loading
* Support nested saving
* Support external & embedded relationship
* Support custom types & entities' field casting

## Example of syntax:

```php
import co from 'co';
import Image from './model/Images';

co(function* () {
  // Adding a many-to-many relation
  var image = yield Image.id(123, { 'embed': 'tags' });
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
