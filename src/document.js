import co from 'co';
import Emitter from 'component-emitter';
import dotpath from 'dotpath-parser';
import { extend, merge } from "extend-merge";
import { expand, flatten } from "expand-flatten";
import { Validator } from "chaos-validator";
import Conventions from "./conventions";
import Collector from "./collector";
import Collection from "./collection/collection";
import Through from "./collection/through";

class Document {

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

    var type = options.type;
    var classname;

    if (type === 'entity') {
      classname = options.model;
    } else {
      classname = this._classes[type];
    }

    options = extend({}, options, { data: data });
    return new classname(options);
  }

  /**
   * Gets the Document default schema instance.
   *
   * @return Object The schema instance.
   */
  static schema() {
    if (this._schema) {
      return this._schema;
    }
    var schema = this.classes().schema;
    this._schema = new schema({
      classes: extend({}, this.classes(), { entity: Document }),
      model: Document
    });
    this._schema.locked(false);
    return this._schema;
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

  /***************************
   *
   *  Document related methods
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
      schema: undefined,
      validator: undefined,
      collector: undefined,
      parent: undefined,
      rootPath: undefined,
      exists: false,
      defaults: false,
      data: {}
    };
    config = extend({}, defaults, config);

    /**
     * The collector instance.
     *
     * @var Object
     */
    this.collector(config.collector);

    /**
     * If this record is chained off of another, contains the origin object.
     *
     * @var Object
     */
    this.parent(config.parent);

    /**
     * Cached value indicating whether or not this instance exists somehow. If this instance has been loaded
     * from the database, or has been created and subsequently saved this value should be automatically
     * setted to `true`.
     *
     * @var Boolean
     */
    this.exists(config.exists);

    /**
     * If this instance has a parent, this value indicates the parent field path.
     *
     * @var String
     */
    this.rootPath(config.rootPath);

    /**
     * The schema instance.
     *
     * @var Object
     */
    this.schema(config.schema);

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

    if (!this._schema || this.constructor !== Document) {
      this._schema = this.constructor.schema();
    }

    if (config.defaults && !config.rootPath) {
      config.data = extend(this._schema.defaults(), config.data);
    }

    this.set(config.data);

    if (this.exists() === false) {
      return;
    }
    this.set(config.data);
    this._persisted = extend({}, this._data);
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
   * Returns the document's schema.
   *
   * @return Object
   */
  schema(schema) {
    if (!arguments.length) {
      if (!this._schema) {
        this._schema = this.constructor.schema();
      }
      return this._schema;
    }
    this._schema = schema;
    return this;
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
  exists(exists) {
    if (arguments.length) {
      this._exists = exists;
      return this;
    }
    return this._exists;
  }

  /**
   * Gets the rootPath (embedded entities).
   *
   * @return String
   */
  rootPath(rootPath) {
    if (arguments.length) {
      this._rootPath = rootPath;
      return this;
    }
    return this._rootPath;
  }

  /**
   * Sets one or several properties.
   *
   * @param  mixed name    A field name or an associative array of fields and values.
   * @param  Array data    An associative array of fields and values or an options array.
   * @param  Array options An options array.
   * @return object        Returns `this`.
   */
  set(name, data) {
    if (arguments.length !== 1) {
      this._set(name, data);
      return this;
    }
    data = name || {};
    if (data === null || typeof data !== 'object' || data.constructor !== Object) {
      throw new Error('A plain object is required to set data in bulk.');
    }
    for (var name in data) {
      this._set(name, data[name]);
    }
    return this;
  }

  /**
   * Checks if property exists.
   *
   * @param String name A field name.
   */
  isset(name) {
    var keys = Array.isArray(name) ? name : dotpath(name);
    if (!keys.length) {
      return;
    }

    var name = keys.shift();
    if (keys.length) {
      var value = this.get(name);
      return value instanceof Document ? value.isset(keys) : false;
    }
    return this._data[name] !== undefined;
  }

  /**
   * Unsets a property.
   *
   * @param String name A field name.
   */
  unset(name) {
    var keys = Array.isArray(name) ? name : dotpath(name);
    if (!keys.length) {
      return;
    }

    var name = keys.shift();
    if (keys.length) {
      var value = this.get(name);
      if (value instanceof Document) {
        value.unset(keys);
      }
      return;
    }
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
  _set(name, data) {
    var keys = Array.isArray(name) ? name : dotpath(name);
    if (!keys.length) {
      throw new Error("Field name can't be empty.");
    }

    var name = keys.shift();
    if (keys.length) {
      if (this.get(name) === undefined) {
        this._set(name, Document.create({}, {
          collector: this.collector(),
          parent: this,
          schema: this.schema(),
          rootPath: this.rootPath() ? this.rootPath() + '.' + name : name,
          defaults: true,
          exists: this.exists()
        }));
      }
      this._data[name].set(keys, data);
      return;
    }

    var schema = this.schema();

    var method = this.model().conventions().apply('setter', name);
    if (this[method] instanceof Function) {
      data = this[method](data);
    }

    var previous = this._data[name];
    var value = schema.cast(name, data, {
      collector: this.collector(),
      parent: this,
      rootPath: this.rootPath(),
      defaults: true,
      exists: this.exists()
    });
    if (previous === value) {
      return;
    }
    this._data[name] = value;
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
    var keys = Array.isArray(name) ? name : dotpath(name);
    if (!keys.length) {
      throw new Error("Field name can't be empty.");
    }

    name = keys.shift();
    if (keys.length) {
      var value = this.get(name);
      if (value === undefined) {
        throw new Error("Unexisting field: `" + name + "`.");
      }
      return value.get(keys);
    }

    var method = this.model().conventions().apply('getter', name);
    if (typeof this[method] === 'function') {
      return this[method](this._data[name]);
    }
    if (this._data[name] !== undefined) {
      return this._data[name];
    }
    if (this.model().hasRelation(name)) {
      return this._data[name] = this.schema().cast(name, undefined, {
        collector: this.collector(),
        parent: this
      });
    }
    var fieldname = this.rootPath() ? this.rootPath() + '.' + name : name;
    if (!this.schema().has(fieldname)) {
      return;
    }
    if (this.schema().field(fieldname, 'type') === 'object') {
      return this._data[name] = this.schema().cast(name, undefined, {
        parent: this,
        model: this.model(),
        rootPath: this.rootPath(),
        defaults: true,
        exists: this.exists()
      });
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
    var schema = this.schema();
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

      if (value && typeof value.modified === 'function') {
        modified = this._persisted[key] !== value || value.modified();
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
   * Returns all included relations accessible through this entity.
   *
   * @param  String prefix The parent relation path.
   * @param  Map    ignore The already processed entities to ignore (address circular dependencies).
   * @return Array         The included relations.
   */
  hierarchy(prefix, ignore)
  {
      prefix = prefix || '';
      ignore = ignore || new Map();

      if (ignore.has(this)) {
          return false;
      } else {
          ignore.set(this, true);
      }

      var tree = this.model().relations();
      var result = [];

      for (var field of tree) {
        if (!this.isset(field)) {
            continue;
        }
        var rel = this.model().relation(field);
        if (rel.type() === 'hasManyThrough') {
            result.push(prefix ? prefix + '.' + field : field);
            continue;
        }
        var childs = this.get(field).hierarchy(field, ignore);
        if (childs.length) {
          for (var value of childs) {
            result.push(value);
          }
        } else if (childs !== false) {
          result.push(prefix ? prefix + '.' + field : field);
        }
      }
      return result;
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
    var defaults = {
      embed: true,
      rootPath: undefined
    };
    options = extend({}, defaults, options);

    if (options.embed === true) {
      options.embed = this.hierarchy();
    }

    var schema = this.schema();
    var embed = schema.treeify(options.embed);
    var result = {};
    var rootPath = options.rootPath;
    for (var field in this._data) {
      var value = this._data[field];
      if (schema.hasRelation(field)) {
        var rel = schema.relation(field);
        if (embed[field] === undefined && !rel.embedded()) {
          continue;
        }
        options.embed = embed[field];
      }
      if (value instanceof Document) {
        options.rootPath = value.rootPath();
        result[field] = value.to(format, options);
      } else if (value && value.forEach instanceof Function) {
        result[field] = Collection.toArray(value, options);
      } else {
        options.rootPath = rootPath ? rootPath + '.' + field : field;
        result[field] = schema.has(options.rootPath) ? schema.format(format, options.rootPath, value, options) : value;
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
Document._classes = {
  collector: Collector,
  set: Collection,
  through: Through,
  conventions: Conventions
};

export default Document;
