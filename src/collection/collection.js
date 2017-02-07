var Emitter = require('component-emitter');
var co = require('co');
var dotpath = require('dotpath-parser');
var extend = require('extend-merge').extend;
var merge = require('extend-merge').merge;
var Collector = require('../collector');

/**
 * `Collection` provide context-specific features for working with sets of data persisted by a backend data store.
 */
class Collection {

  /**
   * Gets/sets classes dependencies.
   *
   * @param  Object classes The classes dependencies to set or none to get it.
   * @return mixed          The classes dependencies.
   */
  static classes(classes) {
    if (arguments.length) {
      this._classes = merge({}, this._classes, classes);
    }
    return this._classes;
  }

  /**
   * Creates a collection.
   *
   * @param Object config Possible options are:
   *                      - `'collector'` _Object_ : A collector instance.
   *                      - `'basePath'`  _String_ : A dotted string field path.
   *                      - `'schema'`    _String_ : The attached schema.
   *                      - `'meta'`      _Array_  : Some meta data.
   *                      - `'data'`      _Array_  : The collection data.
   */
  constructor(config) {
    var defaults = {
      collector: undefined,
      basePath: undefined,
      schema: undefined,
      meta: {},
      data: [],
      exists: false,
      index: undefined
    };

    config = extend({}, defaults, config);

    /**
     * The items contained in the collection.
     *
     * @var Array
     */
    this._data = [];

    /**
     * The schema to which this collection is bound. This
     * is usually the schema that executed the query which created this object.
     *
     * @var Object
     */
    this._schema = undefined;

    /**
     * Cached value indicating whether or not this instance exists somehow. If this instance has been loaded
     * from the database, or has been created and subsequently saved this value should be automatically
     * setted to `true`.
     *
     * @var Boolean
     */
    this._exists = false;

    /**
     * If this `Collection` instance has a parent document (see `$_parent`), this value indicates
     * the key name of the parent document that contains it.
     *
     * @var string
     */
    this._basePath = undefined;

    /**
     * Contains an array of backend-specific meta datas (like pagination datas)
     *
     * @var Object
     */
    this._meta = {};

    /**
     * A reference to `Document`'s parents object.
     *
     * @var Object
     */
    this._parents = new Map();

    this._collector = undefined;

    this.collector(config.collector);

    this.exists(config.exists);

    this.basePath(config.basePath);

    this.schema(config.schema);

    this.meta(config.meta);

    var i, len = config.data.length;

    for (i = 0; i < len; i++) {
      this.set(undefined, config.data[i]);
    }
  }

  /**
   * Gets/sets the collector.
   *
   * @param  Object collector The collector instance to set or none to get the current one.
   * @return Object           A collector instance on get or `this` otherwise.
   */
  collector(collector) {
    if (arguments.length) {
      this._collector = collector;
      return this;
    }
    if (this._collector === undefined || this._collector === null) {
      var collector = this.constructor.classes().collector;
      this._collector = new collector();
    }
    return this._collector;
  }

  /**
   * Get parents.
   *
   * @return Map Returns the parents map.
   */
  parents() {
    return this._parents;
  }

  /**
   * Set a parent.
   *
   * @param  Object parent The parent instance to set.
   * @param  String from   The parent from field to set.
   * @return self
   */
  setParent(parent, from) {
    this._parents.set(parent, from);
    return this;
  }

  /**
   * Unset a parent.
   *
   * @param  Object parent The parent instance to remove.
   * @return self
   */
  removeParent(parent) {
    this._parents.delete(parent);
    return this;
  }

  /**
   * Disconnect the collection from its graph (i.e parents).
   * Note: It has nothing to do with persistance
   *
   * @return self
   */
  disconnect() {
    var parents = this.parents();
    for (var object of parents.keys()) {
      var path = parents.get(object);
      object.remove(path);
    }
    return this;
  }

  /**
   * Gets/sets whether or not this instance has been persisted somehow.
   *
   * @param  Boolean exists The exists value to set or none to get the current one.
   * @return mixed          Returns the exists value on get or `this` otherwise.
   */
  exists(exists) {
    if (arguments.length) {
      this._exists = exists;
      return this;
    }
    return this._exists;
  }

  /**
   * Gets/sets the schema instance.
   *
   * @param  Object schema The schema instance to set or none to get it.
   * @return Object        The schema instance or `this` on set.
   */
  schema(schema) {
    if (!arguments.length) {
      return this._schema;
    }
    this._schema = schema;
    return this;
  }

  /**
   * Gets/sets the basePath (embedded entities).
   *
   * @param  String basePath The basePath value to set or none to get the current one.
   * @return mixed           Returns the basePath value on get or `this` otherwise.
   */
  basePath(basePath) {
    if (arguments.length) {
      this._basePath = basePath;
      return this;
    }
    return this._basePath;
  }

  /**
   * Gets/sets the meta data.
   *
   * @param  String meta The meta value to set or none to get the current one.
   * @return mixed       Returns the meta value on get or `this` otherwise.
   */
  meta(meta) {
    if (arguments.length) {
      this._meta = meta;
      return this;
    }
    return this._meta;
  }

  /**
   * Iterates over the collection.
   *
   * @param Function closure The closure to execute.
   */
  forEach(closure, thisArg) {
    var index = 0;

    if (thisArg) {
      closure = closure.bind(this);
    }

    while (index < this._data.length) {
      closure(this._data[index], index, this);
      index++;
    }
  }

  /**
   * Handles dispatching of methods against all items in the collection.
   *
   * @param  String method The name of the method to call on each instance in the collection.
   * @param  Array  params The parameters to pass on each method call.
   *
   * @return Array         Returns the result array.
   */
  invoke(method, params) {
    var data = [];
    var callParams;
    var isCallable = params instanceof Function;

    params = params || [];

    this.forEach(function(value, key) {
      callParams = isCallable ? params(value, key, this) : params;
      data.push(value[method].apply(value, callParams));
    });

    return data;
  }

  /**
   * Gets an `Entity` object.
   *
   * @param  integer offset The offset.
   * @return mixed          Returns an `Entity` object if exists otherwise returns `undefined`.
   */
  get(offset) {
    if (!arguments.length) {
      return this._data;
    }
    var keys = Array.isArray(offset) ? offset : dotpath(offset);
    if (!keys.length) {
      throw new Error("Invalid empty index `" + offset + "` for collection.");
    }

    var name = keys.shift();
    if (keys.length) {
      if (this._data[name] === undefined) {
        throw new Error("Missing index `" + name + "` for collection.");
      }
      var value = this._data[name];

      if (!value instanceof this.classes().document) {
        throw new Error("The field: `" + name + "` is not a valid document or entity.");
      }
      return value.get(keys);
    }
    if (this._data[name] === undefined) {
      throw new Error("Missing index `" + name + "` for collection.");
    }
    return this._data[name];
  }

  /**
   * Sets data inside the `Collection` instance.
   *
   * @param  mixed offset The offset.
   * @param  mixed data   The entity object or data to set.
   * @return mixed        Returns `this`.
   */
  set(offset, data) {
    var keys = Array.isArray(offset) ? offset : (offset !== undefined ? dotpath(offset) : []);
    var name = keys.shift();

    if (keys.length) {
      if (this._data[name] === undefined) {
        throw new Error("Missing index `" + name + "` for collection.");
      }
      this._data[name].set(keys, data);
      return this;
    }

    if (this.schema()) {
      data = this.schema().cast(undefined, data, {
        collector: this.collector(),
        basePath: this.basePath(),
        exists: this.exists(),
        defaults: true
      });
    } else if (data && data.collector) {
      data.collector(this.collector());
      data.setParent(this, offset);
      data.basePath(this.basePath());
    }

    if (name !== undefined) {
      if (typeof name !== 'number' ) {
       throw new Error("Invalid index `" + name + "` for a collection, must be a numeric value.");
      }
      var value = this._data[name];
      this._data[name] = data;
      if (value && typeof value.removeParent === 'function') {
        value.removeParent(this);
      }
    } else {
      name = this._data.push(data) - 1;
    }
    if (data && typeof data.setParent === 'function') {
      data.setParent(this, name);
    }
    this.trigger('modified', name);
    return this;
  }

  /**
   * Trigger an event through the graph.
   *
   * @param String type The type of event.
   * @param String name The field name.
   */
  trigger(type, name, ignore) {
    name = Array.isArray(name) ? name : [name];
    ignore = ignore || new Map();

    if (ignore.has(this)) {
        return;
    }
    ignore.set(this, true);

    this.emit('modified', name);

    for (var [parent, field] of this.parents()) {
      parent.trigger(type, [field, ...name], ignore);
    }
  }

  /**
   * Watch a path
   *
   * @param String   path    The path.
   * @param Function closure The closure to run.
   */
  watch(path, closure) {
    var keys = [];
    if (arguments.length === 1) {
      closure = path;
    } else {
      keys = Array.isArray(path) ? path : dotpath(path);
    }
    var self = this;
    this.on('modified', (path) => {
      if (keys.every(function(value, i) {
        return path[i] !== undefined && value === path[i];
      })) {
        closure(path);
      }
    });
  }

  /**
   * Adds data into the `Collection` instance.
   *
   * @param  mixed data The entity object to add.
   * @return mixed      Returns the set `Entity` object.
   */
  push(data) {
    this.set(undefined, data);
    return this;
  }

  /**
   * Returns a boolean indicating whether an offset exists for the current `Collection`.
   *
   * @param  String  offset Integer indicating the offset or index of an entity in the set.
   * @return Boolean        Result.
   */
  has(offset) {
    var keys = Array.isArray(offset) ? offset : dotpath(offset);
    if (!keys.length) {
      return;
    }

    var name = keys.shift();
    if (keys.length) {
      var value = this._data[name];
      return typeof value.has === 'function' ? value.has(keys) : false;
    }
    return this._data[name] !== undefined;
  }

  /**
   * Unsets an offset.
   *
   * @param integer $offset The offset to remove.
   */
  remove(offset) {
    var keys = Array.isArray(offset) ? offset : dotpath(offset);
    if (!keys.length) {
      return;
    }

    var name = keys.shift();
    if (keys.length) {
      var value = this._data[name];
      if (typeof value.remove === 'function') {
        value.remove(keys);
      }
      return;
    }
    var value = this._data[name];
    this._data.splice(name, 1);
    if (typeof value.removeParent === 'function') {
      value.removeParent(this);
    }
    this.trigger('modified', name);
  }

  /**
   * Merges another collection to this collection.
   *
   * @param  mixed   collection   A collection.
   *
   * @return Object               Return the merged collection.
   */
  merge(collection) {

    collection.forEach((value) => {
      this.push(value);
    });

    return this;
  }

  /**
   * Clear the collection
   *
   * @return self This collection instance.
   */
  clear() {
    this._data = [];
    return this;
  }

  /**
   * Returns the item keys.
   *
   * @return array The keys of the items.
   */
  keys() {
    return Array.from(this._data.keys());
  }

  /**
   * Counts the items of the object.
   *
   * @return integer Returns the number of items in the collection.
   */
  count() {
    return this._data.length;
  }

  /**
   * Delegates `.length` property to `.count()`.
   */
  get length() { return this.count(); }

  /**
   * Ignores `.length` updates.
   */
  set length(value) {}

  /**
   * Return the collection indexed by an arbitrary field name.
   *
   * @param  String  field   The field name to use for indexing
   * @param  boolean byIndex If `true` return index numbers attached to the index instead of documents.
   * @return Object          The indexed collection
   */
  indexBy(field, byIndex) {
    var indexes = {};
    var Document = this.constructor.classes().document;
    this.forEach(function(document, key) {
      if (!(document instanceof Document)) {
        throw new Error("Only document can be indexed.");
      }

      var index = document.get(field);
      if (!indexes[index]) {
        indexes[index] = [];
      }
      indexes[index].push(byIndex ? key : document);
    });
    return indexes;
  }

  /**
   * Find the index of an entity with a defined id.
   *
   * @param  mixed             id The entity id to look for.
   * @return Integer|undefined    The entity's index number in the collection or `undefined` if not found.
   */
  indexOfId(id) {
    var Model = this.constructor.classes().model;
    var index = 0;
    id = String(id);

    while (index < this._data.length) {
      var entity = this._data[index];
      if (!(entity instanceof Model)) {
        throw new Error('Error, `indexOfId()` is only available on models.');
      }
      if (String(entity.id()) === id) {
        return index;
      }
      index++;
    }
  }

  /**
   * Find the index of an entity with a defined id.
   *
   * @param  String            uuid The entity id to look for.
   * @return Integer|undefined      The entity's index number in the collection or `undefined` if not found.
   */
  indexOfUuid(uuid) {
    var Document = this.constructor.classes().document;
    var index = 0;

    while (index < this._data.length) {
      var document = this._data[index];
      if (!(document instanceof Document)) {
        throw new Error('Error, `indexOfUuid()` is only available on documents.');
      }
      if (String(document.uuid()) === uuid) {
        return index;
      }
      index++;
    }
  }

  /**
   * Filters a copy of the items in the collection.
   *
   * @param  Closure $closure The closure to use for filtering, or an array of key/value pairs to match.
   * @return object           Returns a collection of the filtered items.
   */
  filter(closure) {
    var data = [];

    this.forEach(function(value) {
      if (closure(value)) {
        data.push(value);
      }
    });
    return new this.constructor({ data: data });
  }

  /**
   * Applies a closure to all items in the collection.
   *
   * @param  Function closure The closure to apply.
   * @return object           This collection instance.
   */
  apply(closure) {
    this.forEach((value, key) => {
      this._data[key] = closure(value, key, this);
    });
    return this;
  }

  /**
   * Applies a closure to a copy of all data in the collection
   * and returns the result.
   *
   * @param  Function closure The closure to apply.
   * @return mixed            Returns the set of filtered values inside a `Collection`.
   */
  map(closure) {
    return new this.constructor({ data: this._data.map(closure) });
  }

  /**
   * Reduces, or folds, a collection down to a single value
   *
   * @param  Function closure The filter to apply.
   * @param  mixed    initial Initial value.
   * @return mixed            The reduced value.
   */
  reduce(closure, initial) {
    return this._data.reduce(closure, initial);
  }

  /**
   * Extracts a slice of length items containing the elements from the given start index up the one right before the specified end index.
   *
   * @param  integer start The start offset.
   * @param  integer end   The end offset.
   * @return Object        Returns a sliced collection instance.
   */
  slice(start, end) {
    return new this.constructor({ data: this._data.slice(start, end) });
  }

  /**
   * Changes the contents of an array by removing existing elements and/or adding new elements.
   *
   * @param  integer  offset The offset value.
   * @param  integer  length The number of element to extract.
   * @return Array           An array containing the deleted elements.
   */
  splice(offset, length) {
    var result = this._data.splice(offset, length);
    return result;
  }

  /**
   * Sorts the objects in the collection.
   *
   * @param  Function closure A compare function like strcmp or a custom closure. The
   *                          comparison function must return an integer less than, equal to, or
   *                          greater than zero if the first argument is considered to be respectively
   *                          less than, equal to, or greater than the second.
   * @return object           Returns the new sorted collection.
   */
  sort(closure) {
    this._data.sort(closure);
    return this;
  }


  /**
   * Eager loads relations.
   *
   * @param array $relations The relations to eager load.
   */
  embed(relations) {
    return this.schema().embed(this, relations);
  }

  /**
   * Converts the current state of the data structure to an array.
   *
   * @param  Object options The options array.
   * @return Array          Returns the array value of the data in this `Collection`.
   */
  data(options) {
    return this.to('array', options);
  }

  /**
   * Creates and/or updates a collection and its direct relationship data in the datasource.
   *
   *
   * @param  Object  options Options:
   *                         - `'validate'`  _boolean_: If `false`, validation will be skipped, and the record will
   *                                                      be immediately saved. Defaults to `true`.
   * @return Boolean         Returns `true` on a successful save operation, `false` otherwise.
   */
  broadcast(options) {
    var defaults = { validate: true };
    options = extend({}, defaults, options);

    if (options.validate && !this.validates(options)) {
      return false;
    }
    var schema = this.schema();
    return schema.broadcast(this, options);
  }

  /**
   * Similar to `.broadcast()` except the relationships has not been saved by default.
   *
   * @param  Object  options Same options as `.broadcast()`.
   * @return Boolean         Returns `true` on a successful save operation, `false` on failure.
   */
  save(options) {
    return this.broadcast(extend({}, { embed: false }, options));
  }

  /**
   * Deletes the data associated with the current `Model`.
   *
   * @return Promise Success.
   */
  delete() {
    var schema = this.schema();
    return schema.delete(this);
  }

  /**
   * Validates a collection.
   *
   * @param  Object  options Validate options.
   * @return Promise
   */
  validates(options ) {
    var self = this;
    return co(function*() {
      var success = true;
      for (var entity of self) {
        var ok = yield entity.validates(options);
        if (!ok) {
          success = false;
        }
      }
      return success;
    });
  }

  /**
   * Returns the errors from the last validate call.
   *
   * @return Array The occured errors.
   */
  errors(options) {
    var errors = [];
    var errored = false;
    for (var entity of this) {
      var result = entity.errors();
      errors.push(entity.errors());
      if (Object.keys(result).length) {
        errored = true;
      }
    }
    return errored ? errors : [];
  }

  /**
   * Returns an array of all external relations and nested relations names.
   *
   * @param  String prefix The parent relation path.
   * @param  Map    ignore The already processed entities to ignore (address circular dependencies).
   * @return Array            Returns an array of relation names.
   */
  hierarchy(prefix, ignore) {
    prefix = prefix || '';
    ignore = ignore || new Map();
    var result = new Map();

    for (var entity of this) {
      var hierarchy = entity.hierarchy(prefix, ignore);
      for (var key of hierarchy) {
        result.set(key, true);
      }
    }
    return Array.from(result.keys());
  }

  /**
   * Exports a `Collection` object to another format.
   *
   * The supported values of `format` depend on the registered handlers.
   *
   * Once the appropriate handlers are registered, a `Collection` instance can be converted into
   * any handler-supported format, i.e.:
   *
   * ```php
   * collection.to('json'); // returns a JSON string
   * collection.to('xml'); // returns an XML string
   * ```
   *
   * @param  String format  By default the only supported value is `'array'`. However, additional
   *                        format handlers can be registered using the `formats()` method.
   * @param  Array  options Options for converting the collection.
   * @return mixed          The converted collection.
   */
  to(format, options) {
    var defaults = {cast: true};
    options = extend({}, defaults, options);

    var formatter;

    var data = options.cast ? Collection.toArray(this, options) : this;

    if (typeof format === 'function') {
      return format(data, options);
    } else if (this.constructor.formats(format)) {
      return this.constructor.formats(format)(data, options);
    }
    return data;
  }

  /**
   * Iterator
   */
  [Symbol.iterator]() {
    var index = 0;
    return {
      next: () => {
        return index < this._data.length ? { value: this._data[index++], done: false } : { done: true };
      }
    };
  }

  /**
   * Accessor method for adding format handlers to `Collection` instances.
   *
   * The values assigned are used by `Collection.to()` to convert `Collection` instances into
   * different formats, i.e. JSON.
   *
   * This can be accomplished in two ways. First, format handlers may be registered on a
   * case-by-case basis, as in the following:
   *
   * ```php
   * Collection.formats('json', function(collection, options) {
   *  return json_encode($collection.to('array'));
   * });
   *
   * // You can also implement the above as a static class method, and register it as follows:
   * Collection.formats('json', toJson);
   * ```
   *
   * @param  String format  A string representing the name of the format that a `Collection`
   *                        can be converted to. If `false`, reset the `_formats` attribute.
   *                        If `null` return the content of the `_formats` attribute.
   * @param  mixed  handler The function that handles the conversion, either an anonymous function,
   *                        a fully namespaced class method or `false` to remove the `$format` handler.
   * @return mixed
   */
  static formats(format, handler) {
    if (arguments.length === 0) {
      return this._formats;
    }
    if (arguments.length === 1) {
      return this._formats[format];
    }
    if (format === false) {
      return this._formats = {};
    }
    if (handler === false) {
      delete this._formats[format];
      return;
    }
    return this._formats[format] = handler;
  }

  /**
   * Exports a `Collection` instance to an array. Used by `Collection.to()`.
   *
   * @param  mixed  data    Either a `Collection` instance, or an array representing a
   *                        `Collection`'s internal state.
   * @param  Object options Options used when converting `$data` to an array:
   *                        - `'handlers'` _array_: An array where the keys are fully-namespaced class
   *                          names, and the values are closures that take an instance of the class as a
   *                          parameter, and return an array or scalar value that the instance represents.
   *
   * @return Array          Returns the value of `data` as a pure array, recursively converting all
   *                        sub-objects and other values to their closest array or scalar equivalents.
   */
  static toArray(data, options) {
    var defaults = {
      handlers: {}
    };

    options = extend({}, defaults, options);
    var result = [];

    data.forEach((item, key) => {
      switch (true) {
        case Array.isArray(item):
          result.push(this.toArray(item, options));
        break;
        case (typeof item !== 'object' || item == null):
          if (item !== undefined) {
            result.push(item);
          }
        break;
        case item.constructor && options.handlers[item.constructor.name] !== undefined:
          result.push(options.handlers[item.constructor.name](item));
        break;
        case item.to instanceof Function:
          result.push(item.to('array', options));
        break;
        case item.forEach instanceof Function:
          result.push(this.toArray(item, options));
        break;
        case item.toString instanceof Function:
          result.push(item.toString());
        break;
        default:
          result.push(item);
        break;
      }
    });
    return result;
  }
}

/**
 * Class dependencies.
 *
 * @var Object
 */
Collection._classes = {
  collector: Collector
};

/**
 * Contains all exportable formats and their handler
 *
 * @var Object
 */
Collection._formats = {};

Emitter(Collection.prototype);

module.exports = Collection;
