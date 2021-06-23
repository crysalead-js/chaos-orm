var Emitter = require('component-emitter');
var co = require('co');
var throttle = require('throttleit');
var dotpath = require('dotpath-parser');
var extend = require('extend-merge').extend;
var merge = require('extend-merge').merge;

/**
 * `Collection` provide context-specific features for working with sets of data.
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
    return extend({}, this._classes);
  }

  /**
   * Creates a collection.
   *
   * @param Object config Possible options are:
   *                      - `'basePath'`  _String_ : A dotted string field path.
   *                      - `'schema'`    _String_ : The attached schema.
   *                      - `'meta'`      _Array_  : Some meta data.
   *                      - `'data'`      _Array_  : The collection data.
   */
  constructor(config) {
    var defaults = {
      basePath: undefined,
      schema: undefined,
      meta: {},
      data: [],
      index: undefined
    };

    config = Object.assign(defaults, config);

    /**
     * Loaded data on construct.
     *
     * @var Array
     */
    this._original = [];

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
     * Indicating whether or not this collection has been modified or not after creation.
     *
     * @var Boolean
     */
    this._modified = false;

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

    this._emit = throttle(function(type) {
      this.emit(type);
    }, 50);

    this.basePath(config.basePath);

    this.schema(config.schema);

    this.meta(config.meta);

    // Ignore objects
    if (!config.data || !config.data.length) {
      config.data = [];
    }
    this.amend(config.data, { exists: config.exists, noevent: true });
    this._triggerEnabled = true;
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
  unsetParent(parent) {
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
      object.unset(path);
    }
    return this;
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
      return this._data.slice();
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

      if (!value instanceof this.constructor.classes().document) {
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
   * @param  mixed   offset The offset.
   * @param  mixed   data   The entity object or data to set.
   * @param  Boolean exists Define existence mode of related data
   * @return mixed          Returns `this`.
   */
  set(offset, data) {
    return this.setAt(offset, data);
  }

  /**
   * Sets data inside the `Collection` instance.
   *
   * @param  mixed  offset  The offset.
   * @param  mixed  data    The entity object or data to set.
   * @param  Object options Method options:
   *                        - `'exists'` _boolean_: Determines whether or not this entity exists
   * @return mixed          Returns `this`.
   */
  setAt(offset, data, options) {
    var keys = Array.isArray(offset) ? offset : (offset !== undefined ? dotpath(offset) : []);
    var name = keys.shift();

    if (keys.length) {
      if (this._data[name] === undefined) {
        throw new Error("Missing index `" + name + "` for collection.");
      }
      this._data[name].setAt(keys, data, options);
      return this;
    }

    if (this.schema()) {
      data = this.schema().cast(undefined, data, {
        exists: options ? options.exists : undefined,
        parent: this,
        basePath: this.basePath(),
        defaults: true
      });
    } else if (data && data.setParent) {
      data.setParent(this, offset);
      data.basePath(this.basePath());
    }

    if (name !== undefined) {
      if (typeof name !== 'number' ) {
       throw new Error("Invalid index `" + name + "` for a collection, must be a numeric value.");
      }
      var value = this._data[name];
      this._data[name] = data;
      if (value && typeof value.unsetParent === 'function') {
        value.unsetParent(this);
      }
    } else {
      name = this._data.push(data) - 1;
    }
    if (data && typeof data.setParent === 'function') {
      data.setParent(this, name);
    }
    this._modified = true;
    this.trigger('modified');
    return this;
  }

  /**
   * Trigger an event through the graph.
   *
   * @param String type   The type of event.
   * @param Map    ignore The ignore Map.
   */
  trigger(type, ignore) {
    if (!this._triggerEnabled) {
      return;
    }
    ignore = ignore || new Map();

    if (ignore.has(this)) {
      return;
    }
    ignore.set(this, true);

    for (var [parent, field] of this.parents()) {
      parent.trigger(type, ignore);
    }

    if (Collection._classes.document.emitEnabled) {
      this._emit('modified');
    }
  }

  /**
   * Adds data into the `Collection` instance.
   *
   * @param  mixed   data   The entity object to add.
   * @return mixed          Returns the set `Entity` object.
   */
  push(data) {
    this.setAt(undefined, data);
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
      return value && typeof value.has === 'function' ? value.has(keys) : false;
    }
    return this._data[name] !== undefined;
  }

  /**
   * Unset an offset.
   *
   * @param integer $offset The offset to remove.
   */
  unset(offset) {
    var keys = Array.isArray(offset) ? offset : dotpath(offset);
    if (!keys.length) {
      return;
    }

    var name = keys.shift();
    if (keys.length) {
      var value = this._data[name];
      if (value && typeof value.unset === 'function') {
        value.unset(keys);
      }
      return;
    }
    var value = this._data[name];
    this._data.splice(name, 1);
    if (value && typeof value.unsetParent === 'function') {
      value.unsetParent(this);
    }
    this._modified = true;
    this.trigger('modified');
  }

  /**
   * Gets the modified state of the collection.
   *
   * @return Boolean
   */
  modified(options) {
    options = extend({ embed: false }, options);

    if (this._modified) {
      return true;
    }

    var index = 0;
    var len = this._data.length;

    while (index < len) {
      var entity = this._data[index];
      if (entity && typeof entity.modified === 'function' && entity.modified(options)) {
        return true;
      }
      index++;
    }
    return false;
  }

  /**
   * Amend the collection modifications.
   *
   * @return self
   */
  amend(data, options) {
    if (data && data.length !== undefined) {
      var options = options || {};
      var count = this.length;
      var isModified = false;

      var data = data instanceof Collection ? data.get() : data;

      this._triggerEnabled = false;
      var len = data.length
      for (var i = 0; i < len; i++) {
        this.setAt(i, data[i], options);
        isModified = true;
      }
      for (var j = len; j < count; j++) {
        this.unset(len);
        isModified = true;
      }
      this._triggerEnabled = true;

      if (isModified && !options.noevent) {
        this.trigger('modified');
      }
    }
    this._original = this._data.slice();
    this._modified = false;
    return this;
  }

  /**
   * Append another collection to this collection.
   *
   * @param  mixed   collection   A collection.
   *
   * @return Object               Return the merged collection.
   */
  append(collection, options) {
    this._triggerEnabled = false;
    collection.forEach((value) => {
      this.push(value);
    });
    this._triggerEnabled = true;
    if (!options || !options.noevent) {
      this.trigger('modified');
    }
    return this;
  }

  /**
   * Clear the collection
   *
   * @return self This collection instance.
   */
  clear() {
    this._data = [];
    this._modified = true;
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
   * Find the index of an item.
   *
   * @param  mixed   item      The item to look for.
   * @param  Integer fromIndex The index to start the search at If the provided index value is a negative number,
   *                           it is taken as the offset from the end of the array.
   *                           Note: if the provided index is negative, the array is still searched from front to back
   * @return Integer           The first index of the element in the array; -1 if not found.
   */
  indexOf(item, fromIndex) {
    var n = Math.abs(+fromIndex) || 0;
    var index = Math.max(n >= 0 ? n : len - n, 0);

    while (index < this._data.length) {
      if (this._data[index] === item) {
        return index;
      }
      index++;
    }
    return -1;
  }

  /**
   * Find the last index of an item.
   *
   * @param  mixed   item      The item to look for.
   * @param  Integer fromIndex The index to start the search at If the provided index value is a negative number,
   *                           it is taken as the offset from the end of the array.
   *                           Note: if the provided index is negative, the array is still searched from front to back
   * @return Integer           The first index of the element in the array; -1 if not found.
   */
  lastIndexOf(item, fromIndex) {
    var n = Math.abs(+fromIndex) || 0;
    var index = Math.max(n >= 0 ? n : len - n, 0);

    var result = -1;

    while (index < this._data.length) {
      if (this._data[index] === item) {
        result = index;
      }
      index++;
    }
    return result;
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
    this._modified = true;
    this.trigger('modified');
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
    this._modified = true;
    this.trigger('modified');
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
    return Collection.format('array', this, options);
  }

  /**
   * Returns the original data (i.e the data in the datastore) of the entity.
   *
   * @return Array
   */
  original() {
    return this._original;
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
  save(options) {
    return co(function*() {
      var defaults = {
        validate: true,
        embed: false
      };
      options = extend({}, defaults, options);

      if (options.validate) {
        var valid = yield this.validates(options)
        if (!valid) {
          return false;
        }
      }
      var schema = this.schema();
      return yield schema.save(this, options);
    }.bind(this));
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
      var result = entity.errors(options);
      errors.push(result);
      if (Object.keys(result).length) {
        errored = true;
      }
    }
    return errored ? errors : [];
  }

  /**
   * Returns an array of all external relations and nested relations names.
   *
   * @param  String      prefix The parent relation path.
   * @param  Map         ignore The already processed entities to ignore (address circular dependencies).
   * @param  Boolean     index  Returns an indexed array or not.
   * @return Array|false        Returns an array of relation names.
   */
  hierarchy(prefix, ignore, index) {
    prefix = prefix || '';
    ignore = ignore || new Map();
    var result = {};

    for (var entity of this) {
      var hierarchy = entity.hierarchy(prefix, ignore, true);
      if (!Object.keys(hierarchy).length) {
        continue;
      }
      for (var key in hierarchy) {
        if (!result.hasOwnProperty(key)) {
          result[key] = key;
        }
      }
    }
    return index ? result : Object.keys(result);
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
   * @param  String format  By default the only supported value is `'array'`.
   * @param  Array  options Options for converting the collection.
   * @return mixed          The converted collection.
   */
  to(format, options) {
    var defaults = {
      embed: true,
      basePath: this.basePath()
    };
    options = extend({}, defaults, options);

    var data = Collection.format('array', this, options);

    var path = options.basePath;
    var schema = this.schema();
    if (!schema) {
      return data;
    }
    return schema.format(format, path, data);
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
   * Exports a `Collection` instance to an array. Used by `Collection.to()`.
   *
   * @param  String format  The format.
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
  static format(format, data, options) {
    var defaults = {
      handlers: {}
    };

    options = extend({}, defaults, options);
    var result = [];

    data.forEach((item, key) => {
      switch (true) {
        case Array.isArray(item):
          result.push(this.format('array', item, options));
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
          result.push(item.to(format, options));
        break;
        case item.forEach instanceof Function:
          result.push(this.format('array', item, options));
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
Collection._classes = {};

Emitter(Collection.prototype);

module.exports = Collection;
