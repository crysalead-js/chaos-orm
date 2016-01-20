import co from 'co';
import { extend, merge } from 'extend-merge';
import { expand, flatten } from 'expand-flatten';
import intersect from 'intersect';
import dateformat from 'date-format';
import Conventions from './conventions';
import Relationship from './relationship';
import BelongsTo from './relationship/belongs-to';
import HasOne from './relationship/has-one';
import HasMany from './relationship/has-many';
import HasManyThrough from './relationship/has-many-through';

function normalize(array) {
  var i, len, key, result = {};

  if (typeof array === 'string') {
    array = [array];
  }

  if (!Array.isArray(array)) {
    if (!array || typeof array !== 'object') {
      throw new Error("Invalid passed parameter, can't be normalized.")
    }
    return array;
  }

  len = array.length;
  for (i = 0; i < len; i++) {
    if (typeof array[i] !== 'object') {
      result[array[i]] = null;
      continue;
    }
    if (!array[i]) {
      continue;
    }
    for (key in array[i]) {
      result[key] = array[i][key];
    }
  }
  return result;
}

class Schema {

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
   * Configures the meta for use.
   *
   * @param Object config Possible options are:
   *                      - `'connection'`  _Function_ : The connection instance (defaults to `undefined`).
   *                      - `'source'`      _String_   : The source name (defaults to `undefined`).
   *                      - `'model'`       _Function_ : The fully namespaced model class name (defaults to `undefined`).
   *                      - `'locked'`      _Boolean_  : set the ability to dynamically add/remove fields (defaults to `false`).
   *                      - `'key'`         _String_   : The primary key value (defaults to `id`).
   *                      - `'fields'`      _Map_      : array of field definition where keys are field names and values are arrays
   *                                                     with the following keys. All properties are optionnal except the `'type'`:
   *                                                     - `'type'`       _string_ : the type of the field.
   *                                                     - `'default'`    _mixed_  : the default value.
   *                                                     - `'null'`       _boolean_: allow null value (default to `'true'` excpect for serial).
   *                                                     - `'length'`     _integer_: the length of the data.
   *                                                     - `'precision'`  _integer_: the precision (for decimals).
   *                                                     - `'use'`        _string_ : the database type to override the associated type for this type.
   *                                                     - `'serial'`     _string_ : autoincremented field.
   *                                                     - `'primary'`    _boolean_: primary key.
   *                                                     - `'array'`      _boolean_ : if the field is a collection (default to `'false'`).
   *                      - `'meta'`        _Object_   : array of meta definitions for the schema. The definitions are related to
   *                                                    the datasource. For the MySQL adapter the following options are available:
   *                                                    - `'charset'`    _string_: the charset value to use for the table.
   *                                                    - `'collate'`    _string_: the collate value to use for the table.
   *                                                    - `'engine'`     _stirng_: the engine value to use for the table.
   *                                                    - `'tablespace'` _string_: the tablespace value to use for the table.
   *                      - `'handlers'`    _Object_   : casting handlers.
   *                      - `'conventions'` _Function_ : The naming conventions instance.
   *                      - `'classes'`     _Object_   : The class dependencies.
   */
  constructor(config) {
    var defaults = {
      connection: undefined,
      source: undefined,
      model: undefined,
      locked: true,
      fields: [],
      meta: {},
      handlers: {},
      conventions: undefined,
      classes: this.constructor.classes()
    };

    config = merge({}, defaults, config);

    /**
     * The class dependencies.
     *
     * @var Object
     */
    this._classes = config.classes;

    /**
     * The connection instance.
     *
     * @var Object
     */
    this._connection = config.connection;

    /**
     * Indicates whether the schema is locked or not.
     *
     * @var Boolean
     */
    this._locked = config.locked;

    /**
     * The schema meta data.
     *
     * @var Object
     */
    this._meta = config.meta;

    /**
     * Casting handlers.
     *
     * @var Object
     */
    this._handlers = extend({}, config.handlers, this._handlers());

    /**
     * The conventions instance.
     *
     * @var Object
     */
    this._conventions = config.conventions ? config.conventions : new Conventions();

    /**
     * The fields.
     *
     * @var Object
     */
    this._fields = new Map();

    /**
     * The source name.
     *
     * @var String
     */
    this._source = config.source;

    /**
     * The model to which this schema is bound.
     *
     * @var Function
     */
    this._model = config.model;

    /**
     * The primary key field name.
     *
     * @var String
     */
    config.key = config.key !== undefined ? config.key : this._conventions.apply('key');
    this._key = config.key;

    /**
     * Relations configuration.
     *
     * @var Object
     */
    this._relations = {};

    /**
     * Loaded relationships.
     *
     * @var Object
     */
    this._relationships = {};

    /**
     * Formatters.
     *
     * @var Object
     */
    this._formatters = {};

    var key, handlers;

    for(var field of config.fields) {
      var key = Object.keys(field)[0];
      this._fields.set(key, this._initField(field[key]));
    }

    handlers = this._handlers;

    if (this._connection) {
      this._formatters = this._connection.formatters() || {};
    }

    this.formatter('array', 'id',        handlers['array']['integer']);
    this.formatter('array', 'serial',    handlers['array']['integer']);
    this.formatter('array', 'integer',   handlers['array']['integer']);
    this.formatter('array', 'float',     handlers['array']['float']);
    this.formatter('array', 'decimal',   handlers['array']['float']);
    this.formatter('array', 'date',      handlers['array']['date']);
    this.formatter('array', 'datetime',  handlers['array']['datetime']);
    this.formatter('array', 'boolean',   handlers['array']['boolean']);
    this.formatter('array', 'null',      handlers['array']['null']);
    this.formatter('array', '_default_', handlers['array']['string']);
  }

  /**
   * Gets/sets classes dependencies.
   *
   * @param  Object classes The classes dependencies to set or none to get it.
   * @return mixed          The classes dependencies.
   */
  classes(classes) {
    if (arguments.length) {
      this._classes = extend({}, this._classes, classes);
    }
    return this._classes;
  }

  /**
   * Gets/sets the connection object to which this model is bound.
   *
   * @param  Object connection The connection instance to set or `null` to get the current one.
   * @return mixed             Returns the connection instance on get or `this` on set.
   */
  connection(connection) {
    if (arguments.length) {
      this._connection = connection;
      return this;
    }
    if (!this._connection) {
      throw new Error("Error, missing connection for this schema.");
    }
    return this._connection;
  }

  /**
   * Gets/sets the source name.
   *
   * @param  String source The source name (i.e table/collection name) or `null` to get the defined one.
   * @return mixed         Returns the source on get or `this` on set.
   */
  source(source) {
    if (!arguments.length) {
      return this._source;
    }
    this._source = source;
    return this;
  }

  /**
   * Gets/sets the attached model class.
   *
   * @param  Function model The model class to set to none to get the current model class.
   * @return mixed          The attached model class name on get or `this`.
   */
  model(model) {
    if (!arguments.length) {
      return this._model;
    }
    this._model = model;
    return this;
  }

  /**
   * Gets/sets the schema lock type. When Locked all extra fields which
   * are not part of the schema should be filtered out before saving.
   *
   * @param  Boolean locked The locked value to set to none to get the current lock value.
   * @return mixed          A boolean value or `this`.
   */
  locked(locked) {
    if (!arguments.length) {
      return this._locked;
    }
    this._locked = locked;
    return this;
  }

  /**
   * Gets/Sets the meta data associated to a field is some exists.
   *
   * @param  mixed name The field name. If `undefined` returns all meta. If it's an Object,
   *                    set it as the meta datas.
   * @return mixed      If `name` is a string, it returns the corresponding value
   *                    otherwise it returns a meta data array or `undefined` if not found.
   */
  meta(name, value)
  {
    var num = arguments.length;
    if (!num) {
        return this._meta;
    }
    if (typeof name === 'object' && name !== null) {
        this._meta = name;
        return this;
    }
    if (num === 2) {
        this._meta[name] = value;
        return this;
    }
    return this._meta[name];
  }

  /**
   * Gets/sets the primary key field name of the schema.
   *
   * @param  String key The name or the primary key field name or none to get the defined one.
   * @return String
   */
  key(key) {
    if (!arguments.length) {
        return this._key;
    }
    this._key = key;
    return this;
  }

  /**
   * Returns all schema field names.
   *
   * @return Array An array of field names.
   */
  names() {
    return Array.from(this._fields.keys());
  }

  /**
   * Gets all fields.
   *
   * @return Array
   */
  fields(attribute) {
    var name;
    var fields = [];
    if (!arguments.length) {
      for (var [name, value] of this._fields) {
        var field = {};
        field[name] = value;
        fields.push(field);
      }
    } else {
      for (var [name, value] of this._fields) {
        var field = {};
        field[name] = this.field(name, attribute);
        fields.push(field);
      }
    }
    return fields;
  }

  /**
   * Returns a schema field attribute.
   *
   * @param  String name      A field name.
   * @param  String attribute An attribute name. If `undefined` returns all attributes.
   * @return mixed
   */
  field(name, attribute) {
    if (!this._fields.has(name)) {
      return;
    }
    var field = this._fields.get(name);

    if (attribute !== undefined) {
      return field[attribute];
    }
    return field;
  }

  /**
   * Returns the schema default values.
   *
   * @param  String name An optionnal field name.
   * @return mixed       Returns all default values or a specific one if `name` is set.
   */
  defaults(name) {
    if (arguments.length === 1) {
      return this._fields.has(name) ? this._fields.get(name)['default'] : undefined;
    }
    var defaults = {};
    for (var [name, value] of this._fields) {
      if (value['default'] !== undefined) {
        defaults[name] = value['default'];
      }
    }
    return defaults;
  }

  /**
   * Returns the type value of a field name.
   *
   * @param  String name The field name.
   * @return mixed       The type value or `undefined` if not found.
   */
  type(name) {
    return this.field(name, 'type');
  }

  /**
   * Sets a field.
   *
   * @param  String name The field name.
   * @return Object       Returns `this`.
   */
  set(name, params) {
    var field = this._initField(params);

    if (field.type !== 'object') {
      this._fields.set(name, field);
      return this;
    }
    var relationship = this.classes().relationship;

    if (field.model) {
      field.model = typeof field.model === 'string' ? this.model().registered(field.model) : field.model;
    }

    this.bind(name, {
      type: field.array ? 'set' : 'entity',
      relation: field.array ? 'hasMany' : 'hasOne',
      to: field.model ? field.model : this.model(),
      link: relationship.LINK_EMBEDDED
    });
    this._fields.set(name, field);

    return this;
  }

  /**
   * Normalizes a field.
   *
   * @param  Object field A field Object.
   * @return Object       A normalized field Object.
   */
  _initField(field) {
    var defaults = {
      type: 'string',
      array: false
    };
    if (typeof field === 'string') {
      field = { type: field };
    }
    field = extend({}, defaults, field);

    return extend({}, { null: field.type !== 'serial' }, field);
  }

  /**
   * Removes a field/some fields from the schema.
   *
   * @param  string|array name The field name or an array of field names to remove.
   * @return object             Returns `this`.
   */
  remove(name) {
    var names = Array.isArray(name) ? name : [name];
    var i, len = name.length;
    for (var i = 0; i < len; i++) {
      this._fields.delete(names[i]);
    }
    return this;
  }

  /**
   * Checks if the schema has a field/some fields.
   *
   * @param  String|Object name The field name or an array of field names to check.
   * @return Boolean            Returns `true` if present, `false` otherwise.
   */
  has(name) {
    if (!Array.isArray(name)) {
      return this._fields.has(name);
    }
    return intersect(name, this._fields.keys()).length === name.length;
  }

  /**
   * Appends additional fields to the schema. Will overwrite existing fields if a
   * conflicts arise.
   *
   * @param  Array  fields The fields array or a schema instance to merge.
   * @param  Object meta   New meta data.
   * @return Object        Returns `this`.
   */
  append(fields) {
    if (fields.constructor === Object) {
      for (var key in fields) {
        this._fields.set(key, this._initField(fields[key]));
      }
    } else {
      fields = fields instanceof Schema ? fields.fields() : fields;
      for (var value of fields) {
        var key = Object.keys(value);
        this._fields.set(key, value[key]);
      }
    }
    return this;
  }

  /**
   * Sets a BelongsTo relation.
   *
   * @param  String    name   The name of the relation (i.e. field name where it will be binded).
   * @param  mixed     to     the model to bind.
   * @param  Array     config The configuration that should be specified in the relationship.
   *                          See the `Relationship` class for more information.
   * @return Boolean
   */
  belongsTo(name, to, config) {
    config = extend({}, {
      to: to,
      relation: 'belongsTo'
    }, config);
    return this.bind(name, config);
  }

  /**
   * Sets a hasMany relation.
   *
   * @param  String    name   The name of the relation (i.e. field name where it will be binded).
   * @param  mixed     to     the model to bind.
   * @param  Array     config The configuration that should be specified in the relationship.
   *                          See the `Relationship` class for more information.
   * @return Boolean
   */
  hasMany(name, to, config) {
    config = extend({}, {
      to: to,
      relation: 'hasMany'
    }, config);
    return this.bind(name, config);
  }

  /**
   * Sets a hasOne relation.
   *
   * @param  String    name   The name of the relation (i.e. field name where it will be binded).
   * @param  mixed     to     the model to bind.
   * @param  Array     config The configuration that should be specified in the relationship.
   *                          See the `Relationship` class for more information.
   * @return Boolean
   */
  hasOne(name, to, config) {
    config = extend({}, {
      to: to,
      relation: 'hasOne'
    }, config);
    return this.bind(name, config);
  }

  /**
   * Sets a hasManyThrough relation.
   *
   * @param  String    name    The name of the relation (i.e. field name where it will be binded).
   * @param  String    through the relation name to pivot table.
   * @param  String    using   the target relation name in the through relation.
   * @param  Array     config  The configuration that should be specified in the relationship.
   *                           See the `Relationship` class for more information.
   * @return Boolean
   */
  hasManyThrough(name, through, using, config) {
    config = extend({}, {
      through: through,
      using: using,
      relation: 'hasManyThrough'
    }, config);
    return this.bind(name, config);
  }

  /**
   * Lazy bind a relation.
   *
   * @param  String    name   The name of the relation (i.e. field name where it will be binded).
   * @param  Array     config The configuration that should be specified in the relationship.
   *                          See the `Relationship` class for more information.
   * @return Boolean
   */
  bind(name, config) {
    var relationship = this.classes().relationship;

    config = extend({}, {
      type: 'entity',
      from: this.model(),
      to: undefined,
      link: relationship.LINK_KEY
    }, config);

    config.embedded = config.link.substring(0, 3) !== 'key';

    if (!config.relation || !this.classes()[config.relation]) {
      throw new Error("Unexisting binding relation `" + config.relation + "` for `'{$name}'`.");
    }
    if (!config.from) {
      throw new Error("Binding requires `'from'` option to be set.");
    }
    if (!config.to) {
      if (config.relation !== 'hasManyThrough') {
        throw new Error("Binding requires `'to'` option to be set.");
      }
    } else {
      config.to = typeof config.to === 'string' ? this.model().registered(config.to) : config.to;
    }

    config.array = config.relation.match(/Many/);
    config.type = config.array ? 'set' : config.type;

    if (config.relation === 'hasManyThrough') {
      if (!config.through) {
        throw new Error("Missing `'through'` relation name.");
      }
      if (!this._relations[config.through]) {
        throw new Error("Unexisting `'through'` relation, needed to be created first.");
      }
      this._relations[config.through].junction = true;
      config.using = this._conventions.apply('single', name);
      config.type = 'through';
    }

    this._relations[name] = config;
    this._relationships[name] = undefined;
    return true;
  }

  /**
   * Unbinds a relation.
   *
   * @param String name The name of the relation to unbind.
   */
  unbind(name) {
    if (!this._relations[name]) {
      return;
    }
    delete this._relations[name];
    delete this._relationships[name];
  }

  /**
   * Returns a relationship instance.
   *
   * @param  String name The name of a relation.
   * @return Object      Returns a relationship intance or `undefined` if it doesn't exists.
   */
  relation(name) {
    if (this._relationships[name]) {
      return this._relationships[name];
    }
    if (!this._relations[name]) {
      throw new Error("Relationship `" + name + "` not found.");
    }
    var config = extend({}, {
      name: name,
      conventions: this._conventions
    }, this._relations[name]);

    var relationship = config.relation;
    var relation = this.classes()[config['relation']];

    delete config.relation;
    return this._relationships[name] = new relation(config);
  }

  /**
   * Returns an array of external relation names.
   *
   * @param  Boolean embedded Include or not embedded relations.
   * @return Array             Returns an array of relation names.
   */
  relations(embedded) {
    var result = [];
    embedded = embedded === undefined ? true : false;
    for (var field in this._relations) {
      if (!this._relations[field].embedded || embedded) {
        result.push(field);
      }
    }
    return result;
  }

  /**
   * Checks if a relation exists.
   *
   * @param  String  name The name of a relation.
   * @return Boolean      Returns `true` if the relation exists, `false` otherwise.
   */
  hasRelation(name) {
    return !!this._relations[name];
  }

  /**
   * Eager loads relations.
   *
   * @param Object collection The collection to extend.
   * @param Object relations  The relations to eager load.
   * @param Object options    The fetching options.
   */
  embed(collection, relations, options) {
    return co(function*() {
      var habtm = [], tree = {}, rel, subrelations, path, to, key, query, matches;
      options = options || {};

      relations = this.expand(relations);
      tree = this.treeify(relations);

      for (var name in tree) {

        rel = this.relation(name);
        if (rel.type() === 'hasManyThrough') {
          habtm.push(name);
          continue;
        }

        to = rel.to();
        query = !relations[name] ? {} : relations[name];
        if (typeof query === 'function') {
          options.query = { handler: query };
        } else {
          options.query = query;
        }

        var related = yield rel.embed(collection, options);
        subrelations = {};
        for (path in relations) {
          matches = path.match(new RegExp('^' + name + '\.(.*)$'));
          if (matches) {
            subrelations[matches[1]] = relations[path];
          }
        }
        if (Object.keys(subrelations).length) {
          yield to.schema().embed(related, subrelations, options);
        }
      }

      var i, len;
      len = habtm.length;
      for (i = 0; i < len; i++) {
        rel = this.relation(habtm[i]);
        yield rel.embed(collection, options);
      }

      return collection;

    }.bind(this));
  }

  /**
   * Helper which expands all `'hasManyThrough'` relations into their full path.
   *
   * @param  Object relations       The relations to eager load.
   * @return Object                 The relations with expanded `'hasManyThrough'` relations.
   */
  expand(relations) {
    var num, name, rel, relPath;
    relations = normalize(relations);
    for (var path in relations) {
      num = path.lastIndexOf('.');
      name = num !== -1 ? path.substr(0, num) : path;
      var rel = this.relation(name);
      if (rel.type() !== 'hasManyThrough') {
        continue;
      }
      var relPath = rel.through() + '.' + rel.using() + (num !== -1 ? '.' + path.substr(num + 1) : '');
      if (!relations[relPath]) {
        relations[relPath] = relations[path];
      }
    }
    return relations;
  }

  /**
   * The `'embed'` option normalizer function.
   *
   * @return array The normalized with array.
   */
  treeify(embed)
  {
    if (!embed) {
      return {};
    }
    if (embed === true) {
      embed = this.relations();
    }

    var i, len, keys, relations = {}

    keys = Object.keys(normalize(embed));
    len = keys.length;

    for (i = 0; i < len; i++) {
      relations[keys[i]] = null;
    }
    embed = expand(relations);

    var result = {}, relName, rel, value;
    for (relName in embed) {
      if (!this._relations[relName]) {
        continue;
      }

      value = embed[relName];
      if (this._relations[relName].relation === 'hasManyThrough') {
        rel = this.relation(relName);
        result[rel.through()] = {};
        result[rel.through()][rel.using()] = value;
        result[relName] = value;
      } else {
        result[relName] = value;
      }
    }
    return result;
  }

  /**
   * Casts data according to the schema definition.
   *
   * @param  String name    The field name.
   * @param  Object data    Some data to cast.
   * @param  Object options Options for the casting.
   * @return Object         The casted data.
   */
  cast(name, data, options) {
    var defaults = {
      collector: undefined,
      parent: undefined,
      rootPath: undefined,
      exists: false
    };

    options = extend({}, defaults, options);
    options.model = options.model ? options.model : this._model;

    name = Number.isInteger(name) ? undefined : name;

    if (name) {
      name = options.rootPath ? options.rootPath + '.' + name : name;
    } else {
      name = options.rootPath;
    }

    if (!name) {
      return this._cast(data, options);
    }
    if (this._relations[name]) {
      options = extend({}, this._relations[name], options);
      if (options.embedded) {
        options.rootPath = name;
      }
      if (options.relation !== 'hasManyThrough') {
        options.model = options.to;
      }
      if (options.array) {
        return this._castArray(name, data, options);
      }
      return this._cast(data, options);
    }
    if (this._fields.has(name)) {
      options = extend({}, this._fields.get(name), options);
      if (data === null && options['null']) {
        return null;
      }
      if (options.array) {
        options.type = 'set';
        return this._castArray(name, data, options);
      }
      return this.format('cast', name, data);
    }

    return data;
  }

  /**
   * Casting helper for entities.
   *
   * @param  Object data       Some data to cast.
   * @param  Object options    Options for the casting.
   * @return mixed             The casted data.
   */
  _cast(data, options) {
    if (data instanceof options.model) {
      return data;
    }
    return options.model.create(data ? data : {}, options);
  }

  /**
   * Casting helper for arrays.
   *
   * @param  String name       The field name to cast.
   * @param  Object data       Some data to cast.
   * @param  Object options    Options for the casting.
   * @return mixed             The casted data.
   */
  _castArray(name, data, options) {
    var collection = this.classes()[options.type];
    if (data instanceof collection) {
      return data;
    }
    return options.model.create(data ? data : [], options);
  }

  /**
   * Return default casting handlers.
   *
   * @return Object
   */
  _handlers() {
    return {
      array: {
        'string': function(value, options) {
          return String(value);
        },
        'integer': function(value, options) {
          return Number.parseInt(value);
        },
        'float': function(value, options) {
          return Number.parseFloat(value);
        },
        'date': function(value, options) {
          options = options || {};
          options.format = options.format ? options.format : 'yyyy-MM-dd';
          return this._format('array', 'datetime', value, options);
        }.bind(this),
        'datetime': function(value, options) {
          options = options || {};
          options.format = options.format ? options.format : 'yyyy-MM-dd hh:mm:ss';
          if (!value instanceof Date) {
            value = new Date(value);
          }
          return dateformat.asString(options.format, value);
        },
        'boolean': function(value, options) {
          return !!value;
        },
        'null': function(value, options) {
          return null;
        }
      }
    };
  }

  /**
   * Formats a value according to a field definition.
   *
   * @param   String mode    The format mode (i.e. `'cast'` or `'datasource'`).
   * @param   String name    The field name.
   * @param   mixed  value   The value to format.
   * @param   mixed  options The options array to pass the the formatter handler.
   * @return  mixed          The formated value.
   */
  format(mode, name, value, options) {
    var type = value === null ? 'null' : this.type(name);
    return this._format(mode, type, value, options);
  }

  /**
   * Formats a value according to its type.
   *
   * @param   String mode    The format mode (i.e. `'cast'` or `'datasource'`).
   * @param   String type    The format type.
   * @param   mixed  value   The value to format.
   * @param   mixed  options The options array to pass the the formatter handler.
   * @return  mixed          The formated value.
   */
  _format(mode, type, value, options) {
    var formatter;

    if (this._formatters[mode] && this._formatters[mode][type]) {
      formatter = this._formatters[mode][type];
    } else if (this._formatters[mode] && this._formatters[mode]._default_) {
      formatter = this._formatters[mode]._default_;
    }
    return formatter ? formatter(value, options) : value;
  }

  /**
   * Gets/sets a formatter handler.
   *
   * @param  String   mode          The formatting mode.
   * @param  String   type          The field type name.
   * @param  Function handler       The formatter handler to set or none to get it.
   * @return object                 Returns `this` on set and the formatter handler on get.
   */
  formatter(mode, type, handler) {
    if (arguments.length === 2) {
      return (this._formatters[mode] && this._formatters[mode][type]) ? this._formatters[mode][type] : this._formatters[mode]._default_;
    }
    if (this._formatters[mode] === undefined) {
      this._formatters[mode] = {};
    }
    this._formatters[mode][type] = handler;
    return this;
  }

  /**
   * Gets/sets all formatters.
   *
   * @param  Object formatters The formatters to set or none to get them.
   * @return mixed             Returns `this` on set and the formatters array on get.
   */
  formatters(formatters) {
    if (!arguments.length) {
      return this._formatters;
    }
    this._formatters = formatters;
    return this;
  }

  /**
   * Gets/sets the conventions object to which this schema is bound.
   *
   * @param  object conventions The conventions instance to set or none to get it.
   * @return object             Returns `this` on set and the conventions instance on get.
   */
  conventions(conventions) {
    if (arguments.length) {
      this._conventions = conventions;
      return this;
    }
    return this._conventions;
  }

  /**
   * Returns a query to retrieve data from the connected data source.
   *
   * @param  Object options Query options.
   * @return Object         An instance of `Query`.
   */
  query(options) {
    throw new Error("Missing `query()` implementation for `" + this.model.name + "`'s schema.");
  }

  /**
   * Inserts and/or updates an entity and its direct relationship data in the datasource.
   *
   * @param  Object   entity  The entity instance to save.
   * @param  Object   options Options.
   * @return Promise         Returns a promise.
   */
  save(entity, options) {
    throw new Error("Missing `query()` implementation for `" + this.model.name + "`'s schema.");
  }

  /**
   * Inserts a records  with the given data.
   *
   * @param  Object  data        Typically an array of key/value pairs that specify the new data with which
   *                             the records will be updated. For SQL databases, this can optionally be
   *                             an SQL fragment representing the `SET` clause of an `UPDATE` query.
   * @param  Object  options     Any database-specific options to use when performing the operation.
   * @return boolean             Returns `true` if the update operation succeeded, otherwise `false`.
   */
  insert(data, options) {
    throw new Error("Missing `insert()` implementation for `" + this.model.name + "`'s schema.");
  }

  /**
   * Updates multiple records with the given data, restricted by the given set of criteria (optional).
   *
   * @param  Object  data       Typically an array of key/value pairs that specify the new data with which
   *                            the records will be updated. For SQL databases, this can optionally be
   *                            an SQL fragment representing the `SET` clause of an `UPDATE` query.
   * @param  Object  conditions An array of key/value pairs representing the scope of the records
   *                            to be updated.
   * @param  Object  options    Any database-specific options to use when performing the operation.
   * @return boolean            Returns `true` if the update operation succeeded, otherwise `false`.
   */
  update(data, conditions, options) {
    throw new Error("Missing `update()` implementation for `" + this.model.name + "`'s schema.");
  }

  /**
   * Removes multiple documents or records based on a given set of criteria. **WARNING**: If no
   * criteria are specified, or if the criteria (`conditions`) is an empty value (i.e. an empty
   * array, `undefined` or `null`), all the data in the backend data source (i.e. table or collection) _will_
   * be deleted.
   *
   * @param Object    conditions An array of key/value pairs representing the scope of the records or
   *                             documents to be deleted.
   * @param Object    options    Any database-specific options to use when performing the operation. See
   *                             the `delete()` method of the corresponding backend database for available
   *                             options.
   * @return boolean             Returns `true` if the remove operation succeeded, otherwise `false`.
   */
  delete(conditions, options) {
    throw new Error("Missing `remove()` implementation for `" + this.model.name + "`'s schema.");
  }

  /**
   * Returns the last insert id from the database.
   *
   * @return mixed Returns the last insert id.
   */
  lastInsertId() {
    throw new Error("Missing `lastInsertId()` implementation for `" + this.model.name + "`'s schema.");
  }

}

/**
 * Class dependencies.
 *
 * @var array
 */
Schema._classes = {
  relationship: Relationship,
  belongsTo: BelongsTo,
  hasOne: HasOne,
  hasMany: HasMany,
  hasManyThrough: HasManyThrough
};

export default Schema;
