## Models

* [Definition](#definition)
* [Schema](#schema)
* [Entities](#entities)
* [Validations](#validations)
* [Querying](#Querying)
  * [Querying methods](#querying_methods)
  * [Fetching methods](#fetching_methods)
  * [Scopes](#Scopes)
  * [Global scope](#global_scope)
  * [Querying shortcuts](#querying_shortcuts)
* [Getters/Setters](#getters_getters)

### <a name="definition"></a>Definition

The main purpose of models is to abstract business logic and datasources operations from a higher level. The in-memory representation of data are represented by models instances (i.e entities). And the datasources operations are delegated to the `Schema` instance attached to a model.

In Chaos the built-in `Schema` class for all RDBMS compatible databases is based on `chaos-database`. For example to create a `Gallery` model which uses the RDBMS related `Schema` class you can write:

```js
import { Model } from 'chaos-orm';
import { Schema } from 'chaos-database';

class Gallery extends Model {
}
Gallery._definition = Schema;
```

And a complete model definition could be the following:

```js
import { Model } from 'chaos-orm';
import { Schema } from 'chaos-database';
import Image from './model/image';

class Gallery extends Model {

  static _define(schema) {
    schema.column('id', { type: 'serial' });
    schema.column('name', { type: 'string' });

    schema.hasMany('images', Image);
  }
}
Gallery._definition = Schema;
```

The model definition is pretty straightforward. The schema instance is configured through the `._define()` method.

By default the schema instance is pre-configured with a source name and a primary key field name extracted from the model through a `Conventions` instance. You can set your own `Conventions` instance or manually set the pre-configured values like so:

```js
// Sets a custom prefixed table name
schema.source('prefixed_gallery');

// Uses 'uuid' as field name for primary key instead of 'id'
schema.key('uuid');
```

Note: Composite primary keys have not been implemented in Chaos to minimize the [object-relational impedance mismatch](https://en.wikipedia.org/wiki/Object-relational_impedance_mismatch). It would add a extra overhead with non negligible performance impact otherwise.

### <a name="schema"></a>Schema

In the previous example you noticed that fields and relations are defined using the `._define()` method. More informations on [how to define a schema can by found here](schemas.md)

Once defined, model's schema is available through `.definition()`:

```js
relations = Gallery.definition().relations(); // ['images']
```

To get a specific relation use `.relation()`:

```js
relation = Gallery.definition().relation('images'); // A `HasMany` instance
```

It's also possible to check the availability of a specific relation using `.hasRelation()`:

```js
relation = Gallery.definition().hasRelation('images'); // A boolean
```

### <a name="entities"></a>Entities

Once a model is defined it's possible to create entity instances using `.create()`.

```js
gallery = Gallery.create(['name' => 'MyGallery']);
gallery.set('name', 'MyAwesomeGallery');
```

Note: while this method creates a new entity, there is no effect on the datasource until the `.save()` method is called.

### <a name="validations"></a>Validations

Validation rules are defined at the model level using the following syntax:

```js
import { Model } from 'chaos-orm';
class Gallery extends Model {
  ...

  static _rules(validator) {
    validator.rule('name', 'not:empty');
  }
}
```

You can check the validation documentation for more detail about how rules can be defined.

Then, you can validate entities using `.validate()`:

```js
var gallery = Gallery.create();
gallery.set('name', '');
gallery.validate(); // `false`
gallery.errors();   // { name: ['must not be a empty']}
```

### <a name="nested-validations"></a>Nested Validations

Validation also work in a nested way. To illustrate this feature, let's take the following example:

```js
import { Model } from 'chaos-orm';
import { Schema } from 'chaos-database';
import Gallery from './model/gallery';

class Image extends Model {
  static _define(schema) {
    schema.set('id', {type: 'serial'});
    schema.set('name', {type: 'string'});

    schema.belongsTo('gallery', Gallery);
  }

  static _rules(validator) {
    validator.rule('name', 'not:empty');
  }
}
Image._definition = Schema
```

It's then possible to perform the following:

```js
var gallery = Gallery.create();
gallery.set('name', 'new gallery');
gallery.get('images').push(Image.create({name: 'image1'}));
gallery.get('images').push(Image::create());
gallery.validate(); // `false`
gallery.errors();   // {'images' => [ {}, { name: ['must not be a empty'] }] }
```

### <a name="querying"></a>Querying

The model's `.find()` method is used to perform queries. Using the `chaos-database` implementation, the `.find()` will return a `Query` instance to facilitate the querying.

Note: Under the hood the `.find()` method calls the `.query()` method of the schema's instance. So the query instance depends on the `Schema` class implementation.

Let's start with a simple query for finding all entities:

```js
co(function* () {
  var galleries = yield Gallery.find().all();

  for(var gallery of galleries) {
    console.log(gallery.get('name'));
  }
});
```

#### <a name="querying_methods"></a>Querying methods

With the database schema, it's possible to use the following methods to configure your query on the `Query` instance:

* `conditions()` or `where()` : the `WHERE` conditions
* `group()`  : the `GROUP BY` parameter
* `having()` : the `HAVING` conditions
* `order()`  : the `ORDER BY` parameter
* `with()`   : the relations to include
* `has()`    : some conditions on relations

Note: `'conditions'` is the generic naming for setting conditions. However for RDBMS databases, you can also use `'where'` which is supported as an alias of `'conditions'` to match more closely the SQL API.

So for example, we can write the following query:

```js
co(function* () {
  var galleries = yield Gallery.find()
                               .where({ name: 'MyGallery' })
                               .embed(['images']) // Eager load images
                               .all();

  for(var gallery of galleries) {
    console.log(gallery.get('name'));
    for(var image of gallery.images) {
      console.log(images.get('name'));
    }
  }
});
```

The `.embed()` method allows to eager load relations to minimize the number of queries. In the example above for example, only two queries are executed.

Note: in Chaos `.embed()` doesn't perform any `JOIN` ? I followed the `JOIN` approach in [li3](http://li3.me/) but if I was able to achieve something decent, this strategy generates to a lot of problems to solve like table aliases, redundant data, column references disambiguation, raw references disambiguation. That's why Chaos follows a more straightforward approach and performes multiple queries instead of trying to deal with a massive and inadapted `JOIN` result set.

To deal with JOINs, the `.has()` method is available for RDBMS compatible `Query` instance.

Example:

```js
co(function* () {
  var galleries = yield Gallery.find();
                               .where({ name: 'MyGallery' })
                               .with(['images.tags']);
                               .has('images.tags', {
                                 name: 'computer'
                               }).all();

  for(var gallery of galleries) {
    console.log(gallery.get('name'));
    for(var image of gallery.images) {
      console.log(images.get('name'));
    }
  }
});
```

In the example above three queries are executed. The first one is a `SELECT` on the gallery table with the necessary `JOIN`s to fit the `.has()` condition and return galleries which contain at least an image having the computer tag. The images and the tags are then embedded using two additionnal queries.

Note: In the example above, all images and tags are loaded for returned galleries (i.e not only the `'computer'` tag). The `.has()` method added a constraint at the gallery level only.

#### <a name="fetching_methods"></a>Fetching methods

On `Query` instances it's also possible to use some different getter to fetch records:

* `.all()`   : to get the full collection.
* `.first()` : to get the first entity only.
* `.count()` : to get the count value.
* `.get()`   : to get the full collection (it's an alias to `.all()`)

The response of above methods will depends on the `'return'` option value. By default the fething method will return an entity or a collection of entities. However you can switch to a different representation like in the following:

```js
co(function* () {
  // A collection of entities
  var galleries = yield Gallery.find().all();

  // A collection of objects
  var galleries = yield Gallery.find().all({
    'return': 'object'
  });
});
```

All different representations can be mixed with the `.embed()` parameter to get nested structures.

#### <a name="global_scope"></a>Global scope

You can also set some constraints at a model level to have them used in all queries. The default constraints can be defined in the `static _query` property or by using the `.query()` method:

```js
Galleries.query({
  conditions: { published: true },
  limit: 4
});
```

All futur queries on `Gallery` will be scoped according to `static _query`.

#### <a name="querying_shortcuts"></a>Querying shortcuts

##### .first()

Gets the first entity:

```js
var promise = Gallery.first();

// Similar to
var promise = Gallery.find().first();
```

##### .all()

Gets all entities:

```js
var promise = Gallery.all();

// Similar to
var promise = Gallery.find().all();
```

##### .load()

Gets an entity of a specific id:

```js
var promise = Gallery.load(123);

// Similar to
var promise = Gallery.find().where(['id' => 123]).first();
```

### <a name="getters_getters"></a>Getters/Setters

#### .connection()

Gets/sets the model's connection.

#### .conventions()

Gets/sets the model's conventions.

#### .definition()

Gets/sets the model's schema definition.

#### .validator()

Gets/sets the model's validator instance used to validate entities.
