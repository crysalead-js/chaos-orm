## Entities

* [Creation](#creation)
* [CRUD Actions](#crud)
* [non-CRUD Actions](#non-crud)
* [Additional Methods](#methods)

### <a name="creation"></a>Creation

Once a model has been defined it's possible to create an entity instance using `.create()`:

```js
var gallery = Gallery.create({ name: 'MyGallery' });
gallery.set('name', 'MyGallery');
```

`.create()` first parameter is the entity's data to set. And the second parameter takes an array of options. Main options are:

* `'type'`: can be `'entity'` or `'set'`. `'set'` is used if the passed data represent a collection of entities. Default to `'entity'`.
* `'exists'`: corresponds whether the entity is present in the datastore or not.
* `'defaults'`: indicates whether the entity needs to be populated with their defaults values on creation.
* `'model'`: the model to use for instantiating the entity. Can be useful for implementing [Single Table Inheritance](http://martinfowler.com/eaaCatalog/singleTableInheritance.html)

The meaning of the `'exists'` states can be quite confusing if you don't get its purpose correctly. `'exists'` is used to indicate that the data you are passing is a pre-existing entity (i.e a persisted entity). When the entites are loaded from the database, `exists` is set to `true` by default but it's also possible the manually set the `exists` value:

```js
var gallery = Gallery.create({
  id: 123,
  name: 'MyGallery'
}, { exists: true });

gallery.set('name', 'MyAwesomeGallery');
gallery.save();
```

So the above example will generate **an update query** instead of an insert one.

The `'exists'` attribute can have three different states:

* `true`: means that the entity has already been persited at some point.
* `false`: means that it's a new entity with no existance in the database.

#### Getters/Setters

There's several way to get or set an entity's value. The simplest one is using the "magic" syntax:

```js
entity.set('name', "A name"); // Sets a value
entity.get('name');           // Gets a value
```

But it's also possible to override the default behavior by adding some specific getters & setters function in the model. It can be useful for some pre/post processing or to manage virtual fields.

Let's take the following example:

```js
class User extends Model {
  getFullname() {
    return this.get('firstname') + ' ' + this.get('lastname');
  }
}
```

Then you can access your virtual field like the following:

```js
var user = User.create([
  firstname: 'Johnny',
  lastname: 'Boy'
]);

user.get('fullname'); // Johnny Boy
```

It's also possible to set multiple values in one go using the `.set()` method:

```js
var gallery = Gallery.create();
gallery.set([
  name: 'MyAwesomeGallery',
  updated: new Date()
]);
```

In a reciprocal manner using `.get()` will returns the whole entity's data.

Although it have a different purpose `.to()` is also a useful method to export entity's data into a different format.

For example `.to('array')` (or the alias `.data()`) exports the entity's data using the schema `'array'` formatters. See the [schema documentation to learn more about formatters & custom types](schemas.md).

### <a name="crud"></a>CRUD Actions

CRUD actions are the only built-in actions in Chaos. They are supported through the `.find()`, `.save()` and `.delete()` API methods.

The `.find()` method stands for the READ action and it belongs to the model. And the CREATE, UPDATE and DELETE actions belong to the entity level through the `.save()` and `.delete()` method.

#### Saving an entity

The `.save()` method performs an `INSERT` or an `UPDATE` query depending the entity's exists value. It returns either `true` or `false` depending on the success of operation.

Example of usage:

```js
var gallery = Gallery.create();
gallery.set('name', '');

gallery.save().then(function(gallery) {
  // It passes
}, function(err) {
  // It fails
});
```

Note: the `.save()` method also validates entity's data by default. More information on [validation & errors here](models.md#validations).

The `.save()` method takes as first argument an array of options. Possible values are:

* `'events'`: A string or array defining one or more validation events. Events are different contexts in which data events can occur, and correspond to the optional 'on' key in validation rules. They will be passed to the `.validate()` method if 'validate' is not `false`.
* `'whitelist'`: An array of fields that are allowed to be saved. Defaults to the schema fields.

Once an entity has been saved its exists value is setted to `true`.

Example:

```js
co(function* () {
  var gallery = Gallery.create({
    name: 'MyGallery'
  });
  gallery.exists();             // false

  yield gallery.save();         // insert query
  gallery.exists();             // true

  yield gallery.save();         // update query
  gallery.exists();             // true
});
```

#### Modified and persisted data

You can reliably use `modified()` to check whether a field has been updated or not.

`.modified()` with a field name as argument returns `true` if the field has been modified. If no argument is given, `.modified()` retruns `true` if one of the entity's field has been modified:

```js
var entity = Gallery.create({ name: 'old name' }, { exists: true });
entity.modified('title'); // false

entity.set('name', 'new name');
entity.modified('title'); // true
entity.modified();        // true
```

It's also possible to retrieve the persisted data with `.persisted()` (i.e. the persisted state of values):

```js
var entity = Gallery.create({ name: 'old name' }, { exists: true });
entity.set('name', 'new name');

entity.get('name');        // new name
entity.persisted('name')); // old name
```

#### Deleting an entity

Deleting entities from a datasource is pretty straightforward and can be accomplished by simply calling the `.delete()` method:

```js
co(function* () {
  var gallery = Gallery.create({ name: 'MyGallery' });
  yield gallery.save();

  yield gallery.delete();
  gallery.exists(); // false
});
```

### <a name="non-crud"></a>non-CRUD Actions

To support non-CRUD actions. The first step is to make sure that the `Schema` class of your datasource library can support the feature. Then the next step will be to extend your base model and delegates the processing of your non-CRUD actions to the `Schema` class.

### <a name="methods"></a>Additional Methods

There's a couple of useful method which gives additionnal information about entites.

#### id()

The `.id()` method allows to return the ID value of an entity. It's for example identical to `entity.id` if the primary key field name of your entity is `'id'`.

#### parent()

Most of the time, entites will be connected together through relations. In this context `.parent()` allows to return the parent instance of an entity which can be either an entity or a collection instance.

#### rootPath()

This method is related to embedded entities. The root path indicates at which position an "embedded entity" is located in its entity. The position is represented by a dotted field name string.

This root path is required for embedded entities to make schema casting to work. All field names will be prefixed by the entity root path to be able to match its definition in the entity's schema.
