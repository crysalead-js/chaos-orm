var co = require('co');
var extend = require('extend-merge').extend;
var merge = require('extend-merge').merge;
var Collection = require('./collection');

/**
 * `Through` provide context-specific features for working with sets of data persisted by a backend data store.
 */
class Through {
  /**
   * Creates an alias on an other collection.
   *
   * @param Object config Possible options are:
   *                      - `'parent'`    _Object_   : The parent instance.
   *                      - `'reference'` _Function_ : The attached reference class name.
   *                      - `'through'`   _String_   : The pivot relation name.
   *                      - `'using'`     _String_   : The target relation from pivot.
   *                      - `'data'`      _Array_    : Some data to set on the collection.
   */
  constructor(config) {
    var defaults = {
      parent: undefined,
      schema: undefined,
      through: undefined,
      using: undefined,
      data: []
    };

    config = extend({}, defaults, config);

    /**
     * A reference to this object's parent `Document` object.
     *
     * @var Object
     */
    this._parent = config.parent;

    /**
     * The schema to which this collection is bound. This
     * is usually the schema that executed the query which created this object.
     *
     * @var Object
     */
    this._schema = config.schema;

    /**
     * A the pivot relation name.
     *
     * @var String
     */
    this._through = config.through;

    /**
     * A the target relation name in the pivot model.
     *
     * @var String
     */
    this._using = config.using;

    for (var name of ['parent', 'schema', 'through', 'using']) {
      if (!config[name]) {
        throw new Error("Invalid through collection, `'" + name + "'` is empty.");
      }
      this['_' + name] = config[name];
    }

    for (var entity of config.data) {
      this.push(entity);
    }
  }

  /**
   * Get parents.
   *
   * @return Map Returns the parents map.
   */
  parents() {
    return this._parent.get(this._through).parents();
  }

  /**
   * Set a parent.
   *
   * @param  Object parent The parent instance to set.
   * @param  String from   The parent from field to set.
   * @return self
   */
  setParent(parent, from) {
    this._parent.get(this._through).setParent(parent, from);
    return this;
  }

  /**
   * Unset a parent.
   *
   * @param  Object parent The parent instance to remove.
   * @return self
   */
  unsetParent(parent) {
    this._parent.get(this._through).unsetParent(parent);
    return this;
  }

  /**
   * Disconnect the collection from its graph (i.e parents).
   * Note: It has nothing to do with persistance
   *
   * @return self
   */
  disconnect() {
    this._parent.get(this._through).disconnect();
    return this;
  }

  /**
   * Gets the root instance.
   *
   * @return mixed  Returns the root instance.
   */
  root() {
    return this._parent.get(this._through).root();
  }

  /**
   * Gets/sets whether or not this instance has been persisted somehow.
   *
   * @param  Boolean exists The exists value to set or noen to get the current one.
   * @return mixed          Returns the exists value on get or `this` otherwise.
   */
  exists(exists) {
    if (!arguments.length) {
      return this._parent.get(this._through).exists();
    }
    this._parent.get(this._through).exists(exists);
    return this;
  }

  /**
   * Gets/sets the schema instance.
   *
   * @param  Object schema The schema instance to set or none to get it.
   * @return Object        The schema instance or `this` on set.
   */
  schema() {
    return this._schema;
  }

  /**
   * Gets the base basePath.
   *
   * @return String
   */
  basePath() {
    return '';
  }

  /**
   * Gets the meta data.
   *
   * @return Object
   */
  meta() {
    return this._parent.get(this._through).meta();
  }

  /**
   * Iterates over the collection.
   *
   * @param Function closure The closure to execute.
   */
  forEach(closure, thisArg) {
    var index = 0;
    var collection = this._parent.get(this._through);

    if (thisArg) {
      closure = closure.bind(this);
    }

    while (index < collection.length) {
      closure(collection.get(index).get(this._using), index, this);
      index++;
    }
  }


  /**
   * Handles dispatching of methods against all items in the collection.
   *
   * @param  String method The name of the method to call on each instance in the collection.
   * @param  mixed  params The parameters to pass on each method call.
   *
   * @return mixed         Returns either an array of the return values of the methods, or the
   *                       return values wrapped in a `Collection` instance.
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
   * Returns a boolean indicating whether an offset exists for the
   * current `Collection`.
   *
   * @param  integer offset Integer indicating the offset or index of an entity in the set.
   * @return Boolean        Result.
   */
  has(offset) {
    return this._parent.get(this._through).has(offset);
  }

  /**
   * Gets an `Entity` object.
   *
   * @param  integer offset The offset.
   * @return mixed          Returns an `Entity` object if exists otherwise returns `undefined`.
   */
  get(offset) {
    if (!arguments.length) {
      var data = [];
      this.forEach(function(value) {
        data.push(value);
      });
      return data;
    }
    var entity = this._parent.get(this._through).get(offset)
    if (entity) {
      return entity.get(this._using);
    }
  }

  /**
   * Gets the raw data.
   *
   * @return Array The collection array.
   */
  unbox() {
    return this._parent.get(this._through).unbox();
  }

  /**
   * Adds the specified object to the `Collection` instance, and assigns associated metadata to
   * the added object.
   *
   * @param  Integer offset The offset to assign the value to.
   * @param  mixed   data   The entity object to add.
   * @param  Boolean exists Define existence mode of added data.
   * @return self           Return `this`.
   */
  set(offset, data, exists) {
    var name = this._through;
    this._parent.get(name).set(offset, this._item(data, exists), exists);
    return this;
  }

  /**
   * Adds data into the `Collection` instance.
   *
   * @param  mixed   data   The entity object to add.
   * @param  Boolean exists Define existence mode of added data.
   * @return self           Return `this`.
   */
  push(data, exists) {
    var name = this._through;
    this._parent.get(name).push(this._item(data, exists), exists);
    return this;
  }

  /**
   * Creates a pivot instance.
   *
   * @param  mixed   data   The data.
   * @param  boolean exists The exists value.
   * @return mixed          The pivot instance.
   */
  _item(data, exists) {
    var name = this._through;
    var parent = this._parent;
    var relThrough = this._parent.schema().relation(name);
    var through = relThrough.to();
    var id = this._parent.id();
    var item = through.create(id != null ? relThrough.match(this._parent) : {}, { exists: exists });
    item.set(this._using, data);
    item.get(this._using).exists(exists);
    return item;
  }

  /**
   * Unset an offset.
   *
   * @param integer offset The offset to remove.
   */
  unset(offset) {
    this._parent.get(this._through).unset(offset);
  }

  /**
   * Merges another collection to this collection.
   *
   * @param  mixed   collection   A collection.
   *
   * @return Object               Return the merged collection.
   */
  merge(collection) {

    collection.forEach(function(value) {
      this.push(value);
    }.bind(this));

    return this;
  }

  /**
   * Clear the collection
   *
   * @return self This collection instance.
   */
  clear() {
    this._parent.get(this._through).clear();
    return this;
  }

  /**
   * Returns the item keys.
   *
   * @return Array The keys of the items.
   */
  keys() {
    return this._parent.get(this._through).keys();
  }

  /**
   * Counts the items of the object.
   *
   * @return integer Returns the number of items in the collection.
   */
  count() {
    return this._parent.get(this._through).count();
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
    var collection = this._parent.get(this._through);
    var Document = collection.constructor.classes().document;
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
    var collection = this._parent.get(this._through);

    while (index < collection.length) {
      if (collection.get(index).get(this._using) === item) {
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
    var collection = this._parent.get(this._through);

    var result = -1;

    while (index < collection.length) {
      if (collection.get(index).get(this._using) === item) {
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
    var index = 0;
    var collection = this._parent.get(this._through);
    var Model = collection.constructor.classes().model;

    id = String(id);

    while (index < collection.length) {
      var entity = collection.get(index).get(this._using);
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
    return new Collection({ data: data });
  }

  /**
   * Applies a closure to all items in the collection.
   *
   * @param  Closure $closure The closure to apply.
   * @return object           This collection instance.
   */
  apply(closure) {
    this.forEach(function(value, key) {
      this.set(key, closure(value, key, this));
    }.bind(this));
    return this;
  }

  /**
   * Applies a closure to a copy of all data in the collection
   * and returns the result.
   *
   * @param  Closure closure The closure to apply.
   * @return mixed           Returns the set of filtered values inside a `Collection`.
   */
  map(closure) {
    var data = [];
    this.forEach(function(value, key) {
      data.push(closure(value));
    });
    return new Collection({ data: data });
  }

  /**
   * Reduces, or folds, a collection down to a single value
   *
   * @param  Closure closure The filter to apply.
   * @param  mixed   initial Initial value.
   * @return mixed           The reduced value.
   */
  reduce(closure, initial) {
    var result = initial !== undefined ? initial : 0;
    this.forEach(function(value, key) {
      result = closure(result, value);
    });
    return result;
  }

  /**
   * Extracts a slice of length items starting at position offset from the Collection.
   *
   * @param  integer offset The offset value.
   * @param  integer length The number of element to extract.
   * @return Object         Returns a collection instance.
   */
  slice(offset, length) {
    var result = this._parent.get(this._through).slice(offset, length);
    var data = [];
    result.forEach(function(value, key) {
      data.push(value.get(this._using));
    }.bind(this));
    return new Collection({ data: data });
  }

  /**
   * Changes the contents of an array by removing existing elements and/or adding new elements.
   *
   * @param  integer  offset The offset value.
   * @param  integer  length The number of element to extract.
   * @return Array           An array containing the deleted elements.
   */
  splice(offset, length) {
    this._parent.get(this._through).splice(offset, length);

    var data = [];
    this.forEach(function(value, key) {
      data.push(value.get(this._using));
    }.bind(this));

    return new Collection({ data: data });
  }

  /**
   * Eager loads relations.
   *
   * @param Array relations The relations to eager load.
   */
  embed(relations) {
    return this.schema().embed(this, relations);
  }

  /**
   * Converts the current state of the data structure to an array.
   *
   * @param  Array options The options array.
   * @return array         Returns the array value of the data in this `Collection`.
   */
  data(options){
    return this.to('array', options);
  }

  /**
   * Validates the collection.
   *
   * @param  Array   options Validates option.
   * @return Boolean
   */
  validates(options) {
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
    for (var entity of this) {
      errors.push(entity ? entity.errors(options) : []);
    };
    return errors;
  }

  /**
   * Exports a `Through` object to another format.
   *
   * The supported values of `format` depend on the registered handlers.
   *
   * Once the appropriate handlers are registered, a `Collection` instance can be converted into
   * any handler-supported format, i.e.:
   *
   * ```php
   * through.to('json'); // returns a JSON string
   * through.to('xml'); // returns an XML string
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
    } else if (Collection.formats(format)) {
      return Collection.formats(format)(data, options);
    }
    return data;
  }

  /**
   * Iterator
   */
  [Symbol.iterator]() {
    var index = 0;
    return {
      next: function() {
        var collection = this._parent.get(this._through);
        if (index >= collection.length) {
          return { done: true };
        } else {
          return { value: collection.get(index++).get(this._using), done: false };
        }
      }.bind(this)
    };
  }
}

module.exports = Through;
