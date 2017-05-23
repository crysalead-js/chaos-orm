var dateFormat = require('dateformat');
var extend = require('extend-merge').extend;
var merge = require('extend-merge').merge;
var Document = require('./document');

class Source {
  /**
   * Creates a source instance to deal with casting.
   *
   * @param  config array Array of configuration options.
   * @return Database object.
   */
  constructor(config) {
    config = config || {};

    /**
     * Import/export casting definitions.
     *
     * @var Object
     */
    this._formatters = {};

    /**
     * Type conversion definitions.
     *
     * @var Object
     */
    this._handlers = merge({}, this._handlers(), config.handlers);

    var handlers = this._handlers;

    this.formatter('array', 'object',    handlers.array['object']);
    this.formatter('array', 'integer',   handlers.array['integer']);
    this.formatter('array', 'float',     handlers.array['float']);
    this.formatter('array', 'decimal',   handlers.array['string']);
    this.formatter('array', 'date',      handlers.array['date']);
    this.formatter('array', 'datetime',  handlers.array['datetime']);
    this.formatter('array', 'boolean',   handlers.array['boolean']);
    this.formatter('array', 'null',      handlers.array['null']);

    this.formatter('cast', 'object',    handlers.cast['object']);
    this.formatter('cast', 'integer',   handlers.cast['integer']);
    this.formatter('cast', 'float',     handlers.cast['float']);
    this.formatter('cast', 'decimal',   handlers.cast['decimal']);
    this.formatter('cast', 'date',      handlers.cast['date']);
    this.formatter('cast', 'datetime',  handlers.cast['datetime']);
    this.formatter('cast', 'boolean',   handlers.cast['boolean']);
    this.formatter('cast', 'null',      handlers.cast['null']);
    this.formatter('cast', 'json',      handlers.cast['json']);
    this.formatter('cast', 'string',    handlers.cast['string']);

    this.formatter('datasource', 'object',    handlers.datasource['object']);
    this.formatter('datasource', 'date',      handlers.datasource['date']);
    this.formatter('datasource', 'datetime',  handlers.datasource['datetime']);
    this.formatter('datasource', 'boolean',   handlers.datasource['boolean']);
    this.formatter('datasource', 'null',      handlers.datasource['null']);
    this.formatter('datasource', 'json',      handlers.datasource['json']);
    this.formatter('datasource', '_default_', handlers.datasource['string']);
  }

  /**
   * Return default cast handlers
   *
   * @return array
   */
  _handlers() {
    return {
      array: {
        'object': function(value, options) {
          return value.to('array', options);
        },
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
          options.format = options.format ? options.format : 'yyyy-mm-dd';
          return this.convert('array', 'datetime', value, options);
        }.bind(this),
        'datetime': function(value, options) {
          options = options || {};
          options.format = options.format ? options.format : 'yyyy-mm-dd HH:MM:ss';
          if (!(value instanceof Date)) {
            value = new Date(value);
          }
          return dateFormat(value, options.format);
        },
        'boolean': function(value, options) {
          return !!value;
        },
        'null': function(value, options) {
          return null;
        },
        'json': function(value, options) {
          return !value || !value.to ? value : value.to('array', options);
        }
      },
      cast: {
        'object': function(value, options) {
          return value !== null && typeof value === 'object' && value.constructor === Object ? new Document({ data: value }) : value;
        },
        'string': function(value, options) {
          return String(value);
        },
        'integer': function(value, options) {
          return Number.parseInt(value);
        },
        'float': function(value, options) {
          return Number.parseFloat(value);
        },
        'decimal': function(value, options) {
          var defaults = { precision: 2 };
          options = extend({}, defaults, options);
          return Number(value).toFixed(options.precision);
        },
        'date':function(value, options) {
          return this.convert('cast', 'datetime', value, options);
        }.bind(this),
        'datetime': function(value, options) {
          var date = value instanceof Date ? value : new Date(value);
          if (Number.isNaN(date.getTime())) {
            date = new Date(Date.UTC(70, 0, 1, 0, 0, 0));
          }
          return date;
        },
        'boolean': function(value, options) {
          return !!value;
        },
        'null': function(value, options) {
          return null;
        },
        'json': function(value, options) {
          return typeof value === 'string' ? JSON.parse(value) : value;
        }
      },
      datasource: {
        'object': function(value, options) {
          return value.to('datasource', options);
        },
        'string': function(value, options) {
          return String(value);
        },
        'date': function(value, options) {
          options = options || {};
          options.format = options.format ? options.format : 'yyyy-mm-dd';
          return this.convert('datasource', 'datetime', value, options);
        }.bind(this),
        'datetime': function(value, options) {
          options = options || {};
          options.format = options.format ? options.format : 'yyyy-mm-dd HH:MM:ss';
          if (Number(Number.parseInt(value)) === value) {
            value = Number.parseInt(value) * 1000;
          }
          var date = !(value instanceof Date) ? new Date(value) : value;
          if (Number.isNaN(date.getTime())) {
            throw new Error("Invalid date `" + value + "`, can't be parsed.");
          }
          return dateFormat(date, options.format, true);
        },
        'boolean': function(value, options) {
          return !!value ? '1' : '0';
        },
        'null': function(value, options) {
          return '';
        },
        'json': function(value, options) {
          if (value && value.data) {
            value = value.data();
          }
          return JSON.stringify(value);
        }
      }
    };
  }

  /**
   * Gets/sets a formatter handler.
   *
   * @param  String   mode          The formatting mode (i.e. `'cast'` or `'datasource'`).
   * @param  String   type          The type name.
   * @param  Function handler       The casting handler.
   * @retrun mixed                  A casting handler or `this` on set.
   */
  formatter(mode, type, handler) {
    if (arguments.length === 2) {
      return this._formatters[mode] && this._formatters[mode][type] !== undefined ? this._formatters[mode][type] : this._formatters[mode]['_default_'];
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
   * @param  mixed formatters The formatters to set of nothing to get them all.
   * @return mixed            The formatters of `this` on set.
   */
  formatters(formatters) {
    if (!arguments.length) {
      return extend({}, this._formatters);
    }
    this._formatters = extend({}, formatters);
    return this;
  }

  /**
   * Formats a value according to its type.
   *
   * @param   String mode    The format mode (i.e. `'cast'` or `'datasource'`).
   * @param   String type    The format type.
   * @param   mixed  data    The value to format.
   * @param   mixed  options The options array to pass the the formatter handler.
   * @return  mixed          The formated value.
   */
  convert(mode, type, data, options) {
    var formatter;
    type = data === null ? 'null' : type;
    if (this._formatters[mode] && this._formatters[mode][type]) {
      formatter = this._formatters[mode][type];
    } else if (this._formatters[mode] && this._formatters[mode]._default_) {
      formatter = this._formatters[mode]._default_;
    }
    return formatter ? formatter(data, options) : data;
  }

  /**
   * Extracts the type of a value.
   *
   * @param  mixed  The value.
   * @return String The value type.
   */
  static getType(value) {
    if (typeof value === 'object') {
      if (value === null) {
        return 'null';
      }
      if (Array.isArray(value)) {
        return 'array';
      }
      return 'object';
    }
    if (typeof value === 'string') {
      return 'string';
    }
    if (typeof value === 'boolean') {
      return 'boolean';
    }
    if (typeof value === 'number') {
      return value % 1 === 0 ? 'integer' : 'double';
    }
  }
}

module.exports = Source;
