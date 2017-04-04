Promise = require('bluebird');

var Model = require('../..').Model;
var Schema = require('../fixture/schema');

Model.definition(Schema);

require('./conventions.spec');
require('./collection/collection.spec');
require('./collection/through.spec');
require('./source.spec');
require('./schema.spec');
require('./model.spec');
require('./document.spec');
require('./entity.spec');
require('./buffer.spec');
require('./relationship/relationship.spec');
require('./relationship/belongs-to.spec');
require('./relationship/has-one.spec');
require('./relationship/has-many.spec');
require('./relationship/has-many-through.spec');
