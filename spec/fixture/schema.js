var BaseSchema = require('../../src/schema');

class Schema extends BaseSchema {
  constructor(config) {
    super(config);

    var handlers = this._handlers;
    this.formatter('array', 'id',        handlers['array']['integer']);
    this.formatter('array', 'serial',    handlers['array']['integer']);

    this.formatter('cast', 'id',       handlers['cast']['integer']);
    this.formatter('cast', 'serial',   handlers['cast']['integer']);
  }
}

module.exports = Schema;
