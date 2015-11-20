import { extend, merge } from "extend-merge";
import { expand, flatten } from "expand-flatten";
import Conventions from "./conventions";
import Collector from "./collector";
import Collection from "./collection/collection";
import Through from "./collection/through";

class Model {

  /**
   * Registers a model dependency.
   *
   * @param  String   name  The dependency name.
   * @param  Function model The model to register.
   * @return Object         Returns `this`.
   */
  static register(name, model) {
    if (arguments.length === 2) {
      this._models[name] = model;
      return this;
    }
    var name = name !== undefined ? name : this.name;
    this._models[name] = this;
    return this;
  }

  /**
   * Returns a registered model dependency.
   *
   * @param  String   name The field name.
   * @return Function       Returns `this`.
   */
  static registered(name) {
    if (!arguments.length) {
      return Object.keys(this._models);
    }
    if (this._models[name] === undefined) {
      throw new Error("Undefined `" + name + "` as model dependency, the model need to be registered first.");
    }
    return this._models[name];
  }

  /**
   * Configures the Model.
   *
   * @param Object config Possible options are:
   *                      - `'schema'`      _Object_: The schema instance to use.
   *                      - `'connection'`  _Object_: The connection instance to use.
   *                      - `'conventions'` _Object_: The conventions instance to use.
   */
  static config(config) {
    config = config || {};
    this.classes(config.classes);
    this.conventions(config.conventions);
    this.connection(config.connection);
    this.schema(config.schema);
    this.query(config.query);
  }

  /**
   * Gets/sets classes dependencies.
   *
   * @param  Object classes The classes dependencies to set or none to get it.
   * @return mixed          The classes dependencies.
   */
  static classes(classes) {
    if (arguments.length) {
      this._classes = extend({}, this._classes, classes);
    }
    return this._classes;
  }

  /**
   * Gets/sets the connection object to which this model is bound.
   *
   * @param  Object $connection The connection instance to set or nothing to get the current one.
   * @return Object             Returns a connection instance.
   */
  static connection(connection) {
    if (arguments.length) {
      this._connection = connection;
      delete this._schemas[this.name];
      return this;
    }
    return this._connection;
  }

  /**
   * Gets/sets the conventions object to which this model is bound.
   *
   * @param  Object conventions The conventions instance to set or none to get it.
   * @return mixed              The conventions instance.
   */
  static conventions(conventions) {
    if (arguments.length) {
      this._conventions = conventions;
      return this;
    }
    if (!this._conventions) {
      conventions = this.classes().conventions;
      this._conventions = new conventions();
    }
    return this._conventions;
  }

  /**
   * Gets/sets the default query parameters used on finds.
   *
   * @param  Object query The query parameters.
   * @return Object       Returns the default query parameters.
   */
  static query(query) {
    if (arguments.length) {
      this._query[this.name] = query || {};
    }
    return this._query[this.name] ? this._query[this.name] : {};
  }

  /**
   * This function called once for initializing the model's schema.
   *
   * Example of schema initialization:
   * ```php
   * schema.set('id', { type: 'id' });
   *
   * schema.set('title', { type: 'string', 'default': true });
   *
   * schema.set('body', { type: 'string' });
   *
   * // Custom object
   * schema.set('comments',       { type: 'entity', array: true, 'default': [] });
   * schema.set('comments.id',    { type: 'id' });
   * schema.set('comments.email', { type: 'string' });
   * schema.set('comments.body',  { type: 'string' });
   *
   * // Custom object with a dedicated class
   * schema.set('comments', {
   *    type: 'entity',
   *    model: Comment,
   *    array: true,
   *    default: []
   * });
   *
   * schema.bind('tags', {
   *   relation: 'hasManyThrough',
   *   through: 'post_tag',
   *   using: 'tag'
   * });
   *
   * schema.bind('post_tag', {
   *   relation: 'hasMany',
   *   to: PostTag,
   *   key: { id: 'post_id' }
   * });
   * ```
   *
   * @param Object $schema The schema instance.
   */
  static _define(schema) {
  }

  /**
   * Finds a record by its primary key.
   *
   * @param  Object  options Options for the query.
   *                         -`'conditions'` : The conditions array.
   *                         - other options depend on the ones supported by the query instance.
   *
   * @return Object          An instance of `Query`.
   */
  static find(options) {
    options = extend({}, this.query(), options);
    return this.schema().query({ query: options });
  }

  /**
   * Finds all records matching some conditions.
   *
   * @param  Object options      Options for the query.
   * @param  Object fetchOptions The fecthing options.
   * @return mixed               The result.
   */
  static all(options, fetchOptions) {
    return this.find(options).all(fetchOptions);
  }

  /**
   * Finds the first record matching some conditions.
   *
   * @param  Object options      Options for the query.
   * @param  Object fetchOptions The fecthing options.
   * @return mixed               The result.
   */
  static first(options, fetchOptions) {
    return this.find(options).first(fetchOptions);
  }

  /**
   * Finds a record by its ID.
   *
   * @param  mixed id            The id to retreive.
   * @param  Object fetchOptions The fecthing options.
   * @return mixed               The result.
   */
  static id(id, options, fetchOptions) {
    options = extend({}, { conditions: {} }, options);
    options.conditions[this.schema().primaryKey()] = id;
    return this.first(options, fetchOptions);
  }

  /**
   * Instantiates a new record or document object, initialized with any data passed in. For example:
   *
   * ```php
   * var post = Post.create({ title: 'New post' });
   * echo post.data.title; // echoes 'New post'
   * var success = post.save();
   * ```
   *
   * Note that while this method creates a new object, there is no effect on the database until
   * the `save()` method is called.
   *
   * In addition, this method can be used to simulate loading a pre-existing object from the
   * database, without actually querying the database:
   *
   * ```php
   * var post = Post::create({ id: $id, moreData: 'foo' }, { exists: true });
   * post.data.title = 'New title';
   * var success = post.save();
   * ```
   *
   * @param  Object data    Any data that this object should be populated with initially.
   * @param  Object options Options to be passed to item.
   *                         - `'type'`       _string_ : can be `'entity'` or `'set'`. `'set'` is used if the passed data represent a collection
   *                           of entities. Default to `'entity'`.
   *                         - `'exists'`     _mixed_  : corresponds whether the entity is present in the datastore or not.
   *                         - `'defaults'`   _boolean_: indicates whether the entity needs to be populated with their defaults values on creation.
   *                         - `'model'`      _string_ : the model to use for instantiating the entity. Can be useful for implementing
   *                                                     som Single Table Inheritance.
   * @return Object          Returns a new, un-saved record or document object. In addition to
   *                         the values passed to `data`, the object will also contain any values
   *                         assigned to the `'default'` key of each field defined in the schema.
   */
  static create(data, options)
  {
    var defaults = {
      type:  'entity',
      exists: false,
      model:  this
    };

    options = extend({}, defaults, options);
    options.defaults = !options.exists;

    if (options.defaults && options.type === 'entity') {
      data = extend(expand(this.schema().defaults()), data);
    }

    var type = options.type;
    var classname = type === 'entity' ? options.model : this._classes[type];
    options = extend({}, options, { data: data });
    return new classname(options);
  }

  /**
   * Gets/sets the schema instance.
   *
   * @param  Object schema The schema instance to set or none to get it.
   * @return Object        The schema instance.
   */
  static schema(schema) {
    if (arguments.length) {
      if (typeof schema === 'function') {
        this._schema = schema;
      } else {
        this._schemas[this.name] = schema;
      }
      return this;
    }
    if (this._schemas[this.name] !== undefined) {
      return this._schemas[this.name];
    }

    var config = {
      classes: extend({}, this.classes(), { entity: this }),
      connection: this._connection,
      conventions: this.conventions(),
      model: this
    };
    config.source = this.conventions().apply('source', config.classes.entity.name);

    schema = this._schemas[this.name] = new this._schema(config);
    this._define(schema);
    return schema;
  }

  /**
   * Returns a relationship instance (shortcut).
   *
   * @param  String name The name of a relation.
   * @return Object      Returns a relationship intance or nothing if it doesn't exists.
   */
  static relation(name) {
    return this.schema().relation(name);
  }
  /**
   * Returns a relationship instance (shortcut).
   *
   * @param  String  name The name of a relation.
   * @return Boolean      Returns `true` if the relation exists, `false` otherwise.
   */
  static hasRelation(name) {
    return this.schema().hasRelation(name);
  }
  /**
   * Returns an array of relation names (shortcut).
   *
   * @param  String type A relation type name.
   * @return Array       Returns an array of relation names.
   */
  static relations(type) {
    return this.schema().relations(type);
  }

  /**
   * Resets the Model.
   */
  static reset() {
    this.config();
  }
  /***************************
   *
   *  Entity related methods
   *
   ***************************/
  /**
   * Creates a new record object with default values.
   *
   * @param array $config Possible options are:
   *                      - `'collector'`  _object_ : A collector instance.
   *                      - `'parent'`     _object_ : The parent instance.
   *                      - `'rootPath'`   _string_ : A dotted field names path (for embedded entities).
   *                      - `'exists'`     _boolean_: A boolean or `null` indicating if the entity exists.
   *                      - `'data'`       _array_  : The entity's data.
   *
   */
  constructor(config) {
    var defaults = {
      collector: undefined,
      parent: undefined,
      rootPath: undefined,
      exists: false,
      data: []
    };
    config = extend({}, defaults, config);

    /**
     * The collector instance.
     *
     * @var Object
     */
    this._collector = config.collector;

    /**
     * Contains the values of updated fields. These values will be persisted to the backend data
     * store when the document is saved.
     *
     * @var array
     */
    this._data = {};

    /**
     * Loaded data on construct.
     *
     * @var array
     */
    this._persisted = {};

    /**
     * The list of validation errors associated with this object, where keys are field names, and
     * values are arrays containing one or more validation error messages.
     *
     * @var array
     */
    this._errors = {};

    /**
     * If this record is chained off of another, contains the origin object.
     *
     * @var Object
     */
    this._parent = config.parent;

    /**
     * Cached value indicating whether or not this instance exists somehow. If this instance has been loaded
     * from the database, or has been created and subsequently saved this value should be automatically
     * setted to `true`.
     *
     * @var Boolean
     */
    this._exists = config.exists;

    /**
     * If this instance has a parent, this value indicates the parent field path.
     *
     * @var String
     */
    this._rootPath = config.rootPath;

    this.set(config.data);

    if (this.exists() === false) {
      return;
    }
    this.set(config.data);
    this._persisted = extend({}, this._data);

    var collector = this.collector();
    if (!collector) {
      return;
    }

    var id = this.primaryKey();
    if (!id) {
      return; // TODO: would probably be better to throw an exception here.
    }

    if (!this.constructor._schema) {
      var name = this.constructor.name;
      throw new Error("`" + this.constructor.name + "` has an empty `" + name + "._schema` property.");
    }

    var schema = this.model().schema();
    var source = schema.source();

    if (!collector.exists(source, id)) {
      collector.set(source, id, this);
    }
  }

  /**
   * Returns the entity's model.
   *
   * @return Function
   */
  model() {
    return this.constructor;
  }

  /**
   * Gets/sets the collector instance.
   *
   * @param  Object collector The collector instance to set or none to get it.
   * @return Object           The collector instance on get and this on set.
   */
  collector(collector) {
    if (arguments.length) {
      this._collector = collector;
      return this;
    }
    if (this._collector === undefined || this._collector === null) {
      var collector = this.model().classes().collector;
      this._collector = new collector();
    }
    return this._collector;
  }

  /**
   * Gets/sets the parent.
   *
   * @param  Object parent The parent instance to set or nothing to get it.
   * @return Object        The parent instance on get and this on set.
   */
  parent(parent) {
    if (arguments.length) {
      this._parent = parent;
      return this;
    }
    return this._parent;
  }

  /**
   * Indicating whether or not this instance has been persisted somehow.
   *
   * @return Boolean Retruns `true` if the record was read from or saved to the data-source, `false` otherwise.
   */
  exists() {
    return this._exists;
  }

  /**
   * Gets the rootPath (embedded entities).
   *
   * @return String
   */
  rootPath() {
    return this._rootPath;
  }

  /**
   * Returns the primary key value.
   *
   * @return mixed     The primary key value.
   */
  primaryKey() {
    var id = this.model().schema().primaryKey();
    if (!id) {
      throw new Error("No primary key has been defined for `" + this.model().name + "`'s schema.");
    }
    return this.get(id);
  }

  /**
   * Automatically called after an entity is saved. Updates the object's internal state
   * to reflect the corresponding database record.
   *
   * @param mixed  id      The ID to assign, where applicable.
   * @param Object data    Any additional generated data assigned to the object by the database.
   * @param Object options Method options:
   *                      - `'exists'` _boolean_: Determines whether or not this entity exists
   *                        in data store.
   */
  sync(id, data, options) {
    data = data || {};
    options = options || {};
    if (options.exists !== undefined) {
      this._exists = options.exists;
    }
    var pk = this.model().schema().primaryKey();
    if (id && pk) {
      data[pk] = id;
    }
    this.set(extend({}, this._data, data));
    this._persisted = extend({}, this._data);
    return this;
  }

  /**
   * Sets one or several properties.
   *
   * @param  mixed name    A field name or an associative array of fields and values.
   * @param  Array data    An associative array of fields and values or an options array.
   * @param  Array options An options array.
   * @return object        Returns `this`.
   */
  set(name, data, options) {
    if (typeof name === 'string') {
      return this._set(name, data, options);
    }
    options = data || {};
    data = name || {};
    for (var name in data) {
      this._set(name, data[name], options);
    }
    return this;
  }

  /**
   * Checks if property exists.
   *
   * @param String name A field name.
   */
  isset(name) {
    return this._data[name] !== undefined;
  }

  /**
   * Unsets a property.
   *
   * @param String name A field name.
   */
  unset(name) {
    delete this._data[name];
  }

  /**
   * Helper for the `set()` method.
   *
   * Ps: it allow to use scalar datas for relations. Indeed, on form submission relations datas are
   * provided by a select input which generally provide such kind of array:
   *
   * ```php
   * $array = [
   *     'id' => 3
   *     'comments' => [
   *         '5', '6', '9
   *     ]
   * ];
   * ```
   *
   * To avoid painfull pre-processing, this function will automagically manage such relation
   * array by reformating it into the following on autoboxing:
   *
   * ```php
   * $array = [
   *     'id' => 3
   *     'comments' => [
   *         ['id' => '5'],
   *         ['id' => '6'],
   *         ['id' => '9']
   *     ],
   * ];
   * ```
   *
   * @param String offset  The field name.
   * @param mixed  data    The value to set.
   * @param Array  options An options array.
   */
  _set(name, data, options) {
    if (!name) {
      throw new Error("Field name can't be empty.");
    }
    var defaults = {
      parent: this,
      model: this.model(),
      rootPath: this._rootPath,
      defaults: true,
      exists: false
    };
    options = extend({}, defaults, options);
    var method = this.model().conventions().apply('setter', name);
    if (this[method] instanceof Function) {
      data = this[method](data);
    }
    return this._data[name] = this.model().schema().cast(name, data, options);
  }

  /**
   * Returns the current data.
   *
   * @param  String name If name is defined, it'll only return the field value.
   * @return mixed.
   */
  get(name) {
    if (!arguments.length) {
      return this._data;
    }
    if (!name) {
      throw new Error("Field name can't be empty.");
    }
    var method = this.model().conventions().apply('getter', name);
    if (typeof this[method] === 'function') {
      return this[method](this._data[name]);
    }
    if (this._data[name] !== undefined) {
      return this._data[name];
    }
    if (this.model().hasRelation(name)) {
      return this._data[name] = this.set(name, this.model().schema().cast(name, undefined, {
        collector: this.collector(),
        parent: this
      }));
    }
  }

  /**
   * Returns a string representation of the instance.
   *
   * @return String
   */
  title() {
    return this._data.title ? this._data.title : this._data.name;
  }

  /**
   * Exports the entity into an array based representation.
   *
   * @param  Object options Some exporting options. Possibles values are:
   *                        - `'embed'` _array_: Indicates the relations to embed for the export.
   * @return mixed          The exported result.
   */
  data(options) {
    return this.to('array', options);
  }

  /**
   * Returns the persisted data (i.e the data in the datastore) of the entity.
   *
   * @param  string field A field name or nothing to get all persisted data.
   * @return mixed
   */
  persisted(field) {
    if (!arguments.length) {
      return this._persisted;
    }
    return this._persisted[field];
  }

  /**
   * Gets the modified state of a given field or, if no field is given, gets the state of the whole entity.
   *
   * @param  String field The field name to check its state.
   * @return Array        Returns `true` if a field is given and was updated, `false` otherwise.
   *                      If no field is given returns an array of all modified fields and their
   *                      original values.
   */
  modified(field) {
    if (!this.exists()) {
        return true;
    }
    var schema = this.model().schema();
    var updated = {};
    var fields = field ? [field] : Object.keys(extend({}, this._persisted, this._data));

    var len = fields.length;
    for (var i = 0; i < len; i++) {
      var key = fields[i];
      if (this._data[key] === undefined) {
        if (this._persisted[key] !== undefined) {
          updated[key] = this._persisted[key];
        }
        continue;
      }
      if (this._persisted[key] === undefined) {
        if (!schema.hasRelation(key)) {
          updated[key] = null;
        }
        continue;
      }
      var modified = false;
      var value = this._data[key] !== undefined ? this._data[key] : this._persisted[key];

      if (value && typeof value.modified === 'function' && schema.has(key)) {
        modified = value.modified();
      } else {
        modified = this._persisted[key] !== value;
      }
      if (modified) {
        updated[key] = this._persisted[key];
      }
    }
    if (field) {
      return !!Object.keys(updated).length;
    }
    var result = Object.keys(updated);
    return field ? result : result.length !== 0;
  }

  /**
   * Creates and/or updates an entity and its direct relationship data in the datasource.
   *
   * For example, to create a new record or document:
   * {{{
   * var post = Post.create(); // Creates a new object, which doesn't exist in the database yet
   * post.set('title', 'My post');
   * var success = post.save();
   * }}}
   *
   * It is also used to update existing database objects, as in the following:
   * {{{
   * var post = Post.first(id);
   * post.set('title', 'Revised title');
   * var success = post.save();
   * }}}
   *
   * By default, an object's data will be checked against the validation rules of the model it is
   * bound to. Any validation errors that result can then be accessed through the `errors()`
   * method.
   *
   * {{{
   * if (!post.save()) {
   *     return post.errors();
   * }
   * }}}
   *
   * To override the validation checks and save anyway, you can pass the `'validate'` option:
   *
   * {{{
   * post.set('title', 'We Don't Need No Stinkin' Validation');
   * post.set('body', 'I know what I'm doing.'');
   * post.save({ validate: false });
   * }}}
   *
   * @param  Object  options Options:
   *                          - `'whitelist'` _Array_         : An array of fields that are allowed to be saved to this record.
   *                          - `'locked'`    _Boolean_       : Lock data to the schema fields.
   *                          - `'embed'`     _Boolean|Array_ : List of relations to save.
   * @return Promise
   */
  save(options) {
    return this.model().schema().save(this, options);
  }

  /**
   * Similar to `.save()` except the direct relationship has not been saved by default.
   *
   * @param  Object  options Same options as `.save()`.
   * @return Promise
   */
  persist(options) {
    return this.save(extend({}, { embed: false }, options));
  }

  /**
   * Reloads the entity from the datasource.
   *
   * @return Promise
   */
  reload() {
    var id = this.primaryKey();
    return this.model().id(id).then(function(entity) {
      if (!entity) {
        throw new Error("The entity ID:`" + id + "` doesn't exists.");
      }
      this._exists = true;
      this.set(entity.get());
      this._persisted = extend({}, this._data);
    }.bind(this));
  }

  /**
   * Removes the data associated with the current `Model`.
   *
   * @param  Object  options Options.
   * @return Promise
   */
  delete(options) {
    var schema = this.model().schema();
    var id = schema.primaryKey();
    if (!id || this.exists() === false) {
      return false;
    }
    var params = {};
    params[id] = this.primaryKey();
    return schema.delete(params).then(function() {
      this._exists = false;
      this._persisted = {};
    }.bind(this));
  }

  /**
   * Returns the errors from the last `.validate()` call.
   *
   * @return Object The occured errors.
   */
  errors(options) {
    var defaults = { embed: true };
    options = extend({}, defaults, options);
    var schema = this.model().schema();
    var embed = schema.treeify(options.embed);
    var errors = extend({}, this._errors);
    var value, relation, fieldname;
    for (var name in embed) {
      value = embed[name];
      relation = schema.relation(name);
      fieldname = relation.name();
      if (this._data[fieldname]) {
        errors[fieldname] = this._data[fieldname].errors(extend({}, options, { embed: value }));
      }
    }
    return errors;
  }

  /**
   * Returns a string representation of the instance.
   *
   * @return String Returns the generated title of the object.
   */
  toString() {
    return String(this.title());
  }

  /**
   * Converts the data in the record set to a different format, i.e. json.
   *
   * @param String format  Currently only `json`.
   * @param Object options Options for converting:
   *                        - `'indexed'` _boolean_: Allows to control how converted data of nested collections
   *                        is keyed. When set to `true` will force indexed conversion of nested collection
   *                        data. By default `false` which will only index the root level.
   * @return mixed
   */
  to(format, options) {
    var defaults = { embed: true };
    options = extend({}, defaults, options);

    var schema = this.model().schema();
    var embed = schema.treeify(options.embed);
    var result = {};
    for (var field in this._data) {
      var value = this._data[field];
      if (schema.hasRelation(field)) {
        if (embed[field] === undefined) {
          continue;
        }
        options.embed = embed[field];
      }
      if (value instanceof Model) {
        result[field] = value.to(format, options);
      } else if (value && value.forEach instanceof Function) {
        result[field] = Collection.toArray(value, options);
      } else {
        result[field] = schema.format(format, field, value, options);
      }
    }
    return result;
  }
}

/**
 * Class dependencies.
 *
 * @var Object
 */
Model._classes = {
  collector: Collector,
  set: Collection,
  through: Through,
  conventions: Conventions
};

/**
 * Registered models
 */
Model._models = {};

/**
 * Stores model's schema.
 *
 * @var Object
 */
Model._schemas = {};

/**
 * Default query parameters for the model finders.
 *
 * @var Object
 */
Model._query = {};

/**
 * MUST BE re-defined in sub-classes which require a different connection.
 *
 * @var Object The connection instance.
 */
Model._connection = undefined;

/**
 * MUST BE re-defined in sub-classes which require some different conventions.
 *
 * @var Object A naming conventions.
 */
Model._conventions = undefined;

/**
 * MUST BE re-defined in sub-classes which require a different schema.
 *
 * @var Function
 */
Model._schema = undefined;

export default Model;
