require('babel-core/register');

global.context = describe;
global.Promise = require('bluebird');

require('./conventions-spec');
require('./collection/collection-spec');
require('./collection/through-spec');
require('./cursor-spec');
require('./source-spec');
require('./schema-spec');
require('./model-spec');
require('./entity-spec');
require('./relationship/belongs-to-spec');
require('./relationship/has-one-spec');
require('./relationship/has-many-spec');
require('./relationship/has-many-through-spec');