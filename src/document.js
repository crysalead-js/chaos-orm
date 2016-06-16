import Uuid from 'node-uuid';
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
   * Gets/sets the conventions object to which this class is bound.
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
   * Gets the Document schema definition.
   *
   * @return Object The schema instance.
   */
  static definition() {
    var schema = new this._definition({
      classes: extend({}, this.classes(), { entity: Document }),
      conventions: this.conventions(),
      model: Document
    });
    schema.locked(false);
    return schema;
  }

  /**
   * Instantiates a new record or document object, initialized with any data passed in. For example:
   *
   * ```php
   * var post = Post.create({ title: 'New post' });
   * echo post.get('title'); // echoes 'New post'
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
   * var post = Post::create({ id: id, moreData: 'foo' }, { exists: true });
   * post.set('title', 'New title');
   * var success = post.save();
   * ```
   *
   * @param  Object data    Any data that this object should be populated with initially.
   * @param  Object options Options to be passed to item.
   *                         - `'type'`  _string_ : can be `'entity'` or `'set'`. `'set'` is used if the passed data represent a collection
   *                                                of entities. Default to `'entity'`.
   * @return Object         Returns a new, un-saved record or document object. In addition to
   *                        the values passed to `data`, the object will also contain any values
   *                        assigned to the `'default'` key of each field defined in the schema.
   */
  static create(data, options)
  {
    var defaults = {
      type: 'entity'
    };

    options = extend({}, defaults, options);

    var type = options.type;
    var classname;

    if (type === 'entity') {
      classname = this;
    } else {
      options.schema = this.definition();
      classname = this._classes[type];
    }

    options = extend({}, options, { data: data });
    return new classname(options);
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
   *                      - `'collector'`  _Object_  : A collector instance.
   *                      - `'uuid'`       _Object_  : The object UUID.
   *                      - `'parent'`     _Object_  : The parent instance.
   *                      - `'schema'`     _Object_  : The schema instance.
   *                      - `'basePath'`   _String_  : A dotted field names path (for embedded entities).
   *                      - `'defaults'`   _Boolean_ : Populates or not the fields default values.
   *                      - `'data'`       _Array_   : The entity's data.
   *
   */
  constructor(config) {
    var defaults = {
      collector: undefined,
      uuid: undefined,
      parent: undefined,
      schema: undefined,
      basePath: undefined,
      defaults: true,
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
     * If this instance has a parent, this value indicates the parent field path.
     *
     * @var String
     */
    this.basePath(config.basePath);

    /**
     * Contains the values of updated fields. These values will be persisted to the backend data
     * store when the document is saved.
     *
     * @var Object
     */
    this._data = {};

    /**
     * Loaded data on construct.
     *
     * @var Object
     */
    this._persisted = {};

    /**
     * The list of validation errors associated with this object, where keys are field names, and
     * values are arrays containing one or more validation error messages.
     *
     * @var Object
     */
    this._errors = {};

    this.schema(config.schema);

    if (config.defaults && !config.basePath) {
      config.data = extend(this.schema().defaults(), config.data);
    }

    this.set(config.data);
    this._persisted = extend({}, this._data);

    /**
     * Collect the UUID.
     *
     * @var String
     */
    this.uuid(config.uuid);
  }

  /**
   * Returns the document's model.
   *
   * @return Function
   */
  model() {
    return this.constructor;
  }

  /**
   * Gets/sets the schema instance.
   *
   * @param  Object schema The schema instance to set or none to get it.
   * @return mixed         The schema instance on get or `this` otherwise.
   */
  schema(schema) {
    if (arguments.length) {
       this._schema = schema;
      return this;
    }
    if (!this._schema) {
      this._schema = this.constructor.definition();
    }
    return this._schema;
  }

  /**
   * Gets/sets the instance uuid.
   *
   * @param  String uuid The uuid to set or none to get it.
   * @return mixed       The uuid on get or `this` otherwise.
   */
  uuid(uuid) {
    if (arguments.length) {
      if (this._uuid === uuid) {
        return this;
      }

      var collector = this.collector();
      if (this._uuid) {
        collector.remove(this._uuid);
      }
      this._uuid = uuid;
      if (this._uuid) {
        collector.set(this.uuid(), this);
      }
      return this;
    }
    if (!this._uuid) {
      this._uuid = Uuid.v4();
    }
    return this._uuid;
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
   * @param  Object parent The parent instance to set or `null` to get it.
   * @return mixed         Returns the parent value on get or `this` otherwise.
   */
  parent(parent) {
    if (arguments.length) {
      this._parent = parent;
      return this;
    }
    return this._parent;
  }

  /**
   * Gets/sets the basePath (embedded entities).
   *
   * @param  String basePath The basePath value to set or `null` to get the current one.
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
    name = keys.shift();
    if (!name) {
      throw new Error("Field name can't be empty.");
    }

    if (keys.length) {
      var value = this.get(name);
      if (value.set === undefined) {
        throw new Error("The field: `" + name + "` is not a valid document or entity.");
      }
      return value.get(keys);
    }

    var schema = this.schema();
    var fieldname = this.basePath() ? this.basePath() + '.' + name : name;
    var field = schema.has(fieldname) ? schema.column(fieldname) : {};
    var value;

    if (typeof field.getter === 'function') {
      value = field.getter(this, this._data[name], name);
    } else if (this._data[name] !== undefined) {
      return this._data[name];
    } else if(schema.hasRelation(fieldname)) {
      return this._data[name] = schema.cast(name, undefined, {
        collector: this.collector(),
        parent: this,
        basePath: this.basePath()
      });
    } else if (field.type === 'object') {
      value = [];
    } else {
      return;
    }

    value = schema.cast(name, value, {
      collector: this.collector(),
      parent: this,
      basePath: this.basePath(),
      defaults: true
    });

    if (field.virtual) {
      return value;
    }
    return this._data[name] = value;
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
   * Helper for the `set()` method.
   *
   * Ps: it allow to use scalar datas for relations. Indeed, on form submission relations datas are
   * provided by a select input which generally provide such kind of array:
   *
   * ```php
   * var array = {
   *     id: 3
   *     comments: [
   *         '5', '6', '9
   *     ]
   * };
   * ```
   *
   * To avoid painfull pre-processing, this function will automagically manage such relation
   * array by reformating it into the following on autoboxing:
   *
   * ```php
   * var array = [
   *     id: 3
   *     comments: [
   *         { id: '5' },
   *         { id: '6' },
   *         { id: '9' }
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
    var name = keys.shift();

    if (!name) {
      throw new Error("Field name can't be empty.");
    }

    if (keys.length) {
      if (this.get(name) === undefined) {
        this._set(name, {});
      }
      var value = this._data[name];
      if (value.set === undefined) {
        throw new Error("The field: `" + name + "` is not a valid document or entity.");
      }
      value.set(keys, data);
      return;
    }

    var schema = this.schema();

    var previous = this._data[name];
    var value = this.schema().cast(name, data, {
      collector: this.collector(),
      parent: this,
      basePath: this.basePath(),
      defaults: true
    });
    if (previous === value) {
      return;
    }
    var fieldname = this.basePath() ? this.basePath() + '.' + name : name;
    if (schema.isVirtual(fieldname)) {
      return;
    }
    this._data[name] = value;
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

      var tree = this.schema().relations();
      var result = [];

      for (var field of tree) {
        if (!this.isset(field)) {
            continue;
        }
        var rel = this.schema().relation(field);
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
      verbose: false,
      basePath: undefined
    };
    options = extend({}, defaults, options);

    if (options.embed === true) {
      options.embed = this.hierarchy();
    }

    var schema = this.schema();
    var embed = schema.treeify(options.embed);
    var result = {};
    var basePath = options.basePath;

    var fields = Object.keys(this._data);
    if (options.verbose && schema.locked()) {
      fields = fields.concat(Object.keys(schema.fields()));
    }

    for (var field of fields) {
      if (schema.hasRelation(field)) {
        var rel = schema.relation(field);
        if (!rel.embedded()) {
          if (embed[field] === undefined) {
            continue;
          }
          options.embed = embed[field];
        }
      }
      var value = this._data[field];
      if (value instanceof Document) {
        options.basePath = value.basePath();
        result[field] = value.to(format, options);
      } else if (value && value.forEach instanceof Function) {
        result[field] = Collection.toArray(value, options);
      } else {
        options.basePath = basePath ? basePath + '.' + field : field;
        result[field] = schema.has(options.basePath) ? schema.format(format, options.basePath, value, options) : value;
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
}

/**
 * MUST BE re-defined in sub-classes which require some different conventions.
 *
 * @var Object A naming conventions.
 */
Document._conventions = undefined;

/**
 * MUST BE re-defined in sub-classes which require a different schema.
 *
 * @var Function
 */
Document._definition = undefined;

export default Document;
