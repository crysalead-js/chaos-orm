var Conventions = require('./conventions');
var Collector = require('./collector');
var Collection = require('./collection/collection');
var Through = require('./collection/through');
var Source = require('./source');
var Schema = require('./schema');
var Document = require('./document');
var Model = require('./model');
var Relationship = require('./relationship');
var BelongsTo = require('./relationship/belongs-to');
var HasOne = require('./relationship/has-one');
var HasMany = require('./relationship/has-many');
var HasManyThrough = require('./relationship/has-many-through');

/**
 * Populates circular dependencies below since they are not supported by Babel yet.
 */
Document._definition = Schema;
Model._definition = Schema;

module.exports = {
  Conventions,
  Collector,
  Collection,
  Through,
  Source,
  Schema,
  Model,
  Document,
  Relationship,
  BelongsTo,
  HasOne,
  HasMany,
  HasManyThrough
};
