var dateFormat = require('dateformat');
var extend = require('extend-merge').extend;
var merge = require('extend-merge').merge;

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

    this.formatter('array', 'integer',   handlers.array['integer']);
    this.formatter('array', 'float',     handlers.array['float']);
    this.formatter('array', 'decimal',   handlers.array['string']);
    this.formatter('array', 'date',      handlers.array['date']);
    this.formatter('array', 'datetime',  handlers.array['datetime']);
    this.formatter('array', 'boolean',   handlers.array['boolean']);
    this.formatter('array', 'null',      handlers.array['null']);
    this.formatter('array', '_default_', handlers.array['string']);

    this.formatter('cast', 'integer',   handlers.cast['integer']);
    this.formatter('cast', 'float',     handlers.cast['float']);
    this.formatter('cast', 'decimal',   handlers.cast['decimal']);
    this.formatter('cast', 'date',      handlers.cast['date']);
    this.formatter('cast', 'datetime',  handlers.cast['datetime']);
    this.formatter('cast', 'boolean',   handlers.cast['boolean']);
    this.formatter('cast', 'null',      handlers.cast['null']);
    this.formatter('cast', 'string',    handlers.cast['string']);

    this.formatter('datasource', 'object',    handlers.datasource['object']);
    this.formatter('datasource', 'date',      handlers.datasource['date']);
    this.formatter('datasource', 'datetime',  handlers.datasource['datetime']);
    this.formatter('datasource', 'boolean',   handlers.datasource['boolean']);
    this.formatter('datasource', 'null',      handlers.datasource['null']);
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
        }
      },
      cast: {
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
   * Formats a value according to its definition.
   *
   * @param   String mode    The formatting mode (i.e. `'cast'` or `'datasource'`).
   * @param   String type    The type name.
   * @param   mixed  value   The value to format.
   * @param   Object options The options the pass to the casting handler.
   * @return  mixed          The formated value.
   */
  convert(mode, type, value, options) {
    var type = value === null ? 'null' : type;
    var formatter = null;
    if (this._formatters[mode]) {
      if (this._formatters[mode][type] !== undefined) {
        formatter = this._formatters[mode][type];
      } else if (this._formatters[mode]['_default_'] !== undefined) {
        formatter = this._formatters[mode]['_default_'];
      }
    }
    return formatter ? formatter(value, options) : value;
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
