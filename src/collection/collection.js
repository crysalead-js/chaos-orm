import co from 'co';
import dotpath from 'dotpath-parser';
import { extend, merge } from 'extend-merge';
import Collector from "../collector";

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
   *                      - `'collector'` _object_ : A collector instance.
   *                      - `'parent'`    _object_ : The parent instance.
   *                      - `'rootPath'`  _string_ : A dotted string field path.
   *                      - `'model'`     _string_ : The attached model class name.
   *                      - `'meta'`      _array_  : Some meta data.
   *                      - `'data'`      _array_  : The collection data.
   */
  constructor(config) {
    var defaults = {
      collector: undefined,
      parent: undefined,
      rootPath: undefined,
      model: undefined,
      meta: {},
      data: [],
      exists: false
    };

    config = extend({}, defaults, config);

    /**
     * The collector instance.
     *
     * @var Object
     */
    this._collector = config.collector;

    /**
     * A reference to this object's parent `Document` object.
     *
     * @var object
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
     * If this `Collection` instance has a parent document (see `$_parent`), this value indicates
     * the key name of the parent document that contains it.
     *
     * @var string
     */
    this._rootPath = config.rootPath;

    /**
     * The model to which this entity set is bound. This
     * is usually the model that executed the query which created this object.
     *
     * @var Function
     */
    this._model = config.model;

    /**
     * Contains an array of backend-specific meta datas (like pagination datas)
     *
     * @var Object
     */
    this._meta = config.meta;

    /**
     * The items contained in the collection.
     *
     * @var Array
     */
    this._data = [];

    var i, len = config.data.length;

    for (i = 0; i < len; i++) {
      this._set(undefined, config.data[i]);
    }

    /**
     * Loaded items on construct.
     *
     * @var Array
     */
    this._loaded = this._data.slice(0);
  }

  /**
   * Gets/sets the collector.
   *
   * @param  Object collector The collector instance to set or none to get the current one.
   * @return Object           A collector instance on get otherwise `this`.
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
   * Gets/sets the parent instance.
   *
   * @param  Object parent The parent instance to set or none to get the current one.
   * @return Object
   */
  parent(parent) {
    if (!arguments.length) {
      return this._parent;
    }
    this._parent = parent;
    return this;
  }

  /**
   * Indicating whether or not this instance has been persisted somehow.
   *
   * @return Boolean Retruns `true` if the record was read from or saved to the data-source, `false` otherwise.
   */
  exists() {
    if (arguments.length) {
      this._exists = exists;
      return this;
    }
    return this._exists;
  }

  /**
   * Gets the rootPath.
   *
   * @return string
   */
  rootPath() {
    return this._rootPath;
  }

  /**
   * Returns the model on which this particular collection is based.
   *
   * @return Function The model.
   */
  model() {
    return this._model;
  }

  /**
   * Gets the meta data.
   *
   * @return Object
   */
  meta() {
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
    return this._data[offset];
  }

  /**
   * Sets data inside the `Collection` instance.
   *
   * @param  integer offset The offset.
   * @param  mixed   data   The entity object to add.
   * @return mixed          Returns the set `Entity` object.
   */
  set(offset, data) {
    this._set(offset, data);
    return this;
  }

  /**
   * Adds data into the `Collection` instance.
   *
   * @param  mixed data The entity object to add.
   * @return mixed      Returns the set `Entity` object.
   */
  push(data) {
    this._set(undefined, data);
    return this;
  }

  /**
   * Returns a boolean indicating whether an offset exists for the current `Collection`.
   *
   * @param  String  offset Integer indicating the offset or index of an entity in the set.
   * @return Boolean        Result.
   */
  isset(offset) {
    var keys = Array.isArray(offset) ? name : dotpath(offset);
    if (!keys.length) {
      return;
    }

    var name = keys.shift();
    if (keys.length) {
      var value = this.get(name);
      return typeof value.isset === 'function' ? value.isset(keys) : false;
    }
    return this._data[offset] !== undefined;
  }

  /**
   * Unsets an offset.
   *
   * @param integer $offset The offset to unset.
   */
  unset(offset) {
    var keys = Array.isArray(offset) ? name : dotpath(offset);
    if (!keys.length) {
      return;
    }

    var name = keys.shift();
    if (keys.length) {
      var value = this.get(name);
      if (typeof value.unset === 'function') {
        value.unset(keys);
      }
      return;
    }
    this._data.splice(offset, 1);
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
   * Filters a copy of the items in the collection.
   *
   * @param  Closure $closure The closure to use for filtering, or an array of key/value pairs to match.
   * @return object           Returns a collection of the filtered items.
   */
  find(closure) {
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
    this.forEach(function(value, key) {
      this._data[key] = closure(value, key, this);
    }.bind(this));
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
   * Extracts a slice of length items starting at position offset from the Collection.
   *
   * @param  integer offset The offset value.
   * @param  integer length The number of element to extract.
   * @return Object         Returns a collection instance.
   */
  slice(offset, length) {
    return new this.constructor({ data: this._data.splice(offset, length) });
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
   * Sets data to a specified offset and wraps all data array in its appropriate object type.
   *
   * @param  mixed   data    An array or an entity instance to set.
   * @param  integer offset  The offset. If offset is empty data will simply be appended to the set.
   * @return mixed           Returns the inserted instance.
   */
  _set(offset, data) {
    var keys = Array.isArray(offset) ? offset : (offset !== undefined ? dotpath(offset) : []);
    offset = keys.shift();

    if (keys.length) {
      if (!this._data[offset]) {
        throw new Error("Missing index `" + offset + "` for collection.");
      }
      this._data[offset].set(keys, data);
    }

    if (this.model()) {
      data = this.model().schema().cast(undefined, data, {
        collector: this.collector(),
        parent: this,
        rootPath: this.rootPath(),
        exists: this.exists(),
        defaults: true
      });
    }

    if (offset !== undefined) {
      if (typeof offset !== 'number' ) {
       throw new Error("Invalid index `" + offset + "` for a collection, must be a numeric value.");
      }
      this._data[offset] = data;
    } else {
      this._data.push(data);
    }
    return data;
  }

  /**
   * Eager loads relations.
   *
   * @param array $relations The relations to eager load.
   */
  embed(relations) {
    return this.model().schema().embed(this, relations);
  }

  /**
   * Converts the current state of the data structure to an array.
   *
   * @param  Object options The options array.
   * @return Array          Returns the array value of the data in this `Collection`.
   */
  data(options) {
    return this.constructor.toArray(this, options);
  }

  /**
   * Validates a collection.
   *
   * @param  Object  options Validate options.
   * @return Promise
   */
  validate(options ) {
    var self = this;
    return co(function*() {
      var success = true;
      for (var entity of self) {
        var ok = yield entity.validate(options);
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
      errors.push(entity.errors());
    }
    return errors;
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
   * Iterator
   */
  [Symbol.iterator]() {
    var index = 0;
    return {
      next: function() {
        return index < this._data.length ? { value: this._data[index++], done: false } : { done: true };
      }.bind(this)
    };
  }

  /**
   * Exports a `Collection` instance to an array. Used by `Collection::to()`.
   *
   * @param  mixed  data    Either a `Collection` instance, or an array representing a
   *                        `Collection`'s internal state.
   * @param  Object options Options used when converting `$data` to an array:
   *                        - `'handlers'` _array_: An array where the keys are fully-namespaced class
   *                          names, and the values are closures that take an instance of the class as a
   *                          parameter, and return an array or scalar value that the instance represents.
   *
   * @return array          Returns the value of `$data` as a pure PHP array, recursively converting all
   *                        sub-objects and other values to their closest array or scalar equivalents.
   */
  static toArray(data, options) {
    var defaults = {
      handlers: {}
    };

    options = extend({}, defaults, options);
    var result = [];

    data.forEach(function(item, key) {
      switch (true) {
        case Array.isArray(item):
          result.push(this.toArray(item, options));
        break;
        case (item && typeof item !== 'object'):
          result.push(item);
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
    }.bind(this));
    return result;
  }
}

/**
 * Class dependencies.
 *
 * @var Array
 */
Collection._classes = {
  collector: Collector
};

export default Collection;
