## Connections

Connections needs to be configured first at a bootstrap level.

Let's create a PostgreSql connection:

```js
import PostgreSql from 'chaos-database-postgresql';

var connection = new PostgreSql({
  database: 'mydatabase',
  username: 'mylogin',
  password: 'mypassword'
});
```

Then te connection is bindined to our models using `Model.connection()`:

```js
import { Model } from 'chaos-orm';

Model.connection($connection);
```

Now all models extending `Model` will use the `PostgreSql` connection.

Note: under the hood the model don't use the connection directly but use it through its attached schema instance. So when `.schema()` is called on a specific model, the returned schema is correctly configured with the model's connection.

To be able to use different connections, you will need to create as many base model as you need different connections.

Let's illustrate this point with an example:

```js
import { Model } from 'chaos-orm';

class NewBaseModel extends Model {
}
/**
 * Re-defining the `_connection` attribute in a base model class will
 * allow to attach a specific connection to it and all its subclasses.
 */
NewBaseModel._connection = null;
```

So now all models extending `NewBaseModel` can be connected that way:

```js
import { Model } from 'chaos-orm';
import MyApi from './api/my-api'; // Example of a custom HTTP based connection

var connection = new MyApi({
  scheme: 'http',
  host: 'my.api.com',
  socket: 'Curl',
  username: 'mylogin',
  password: 'mypassword'
]);

NewBaseModel.connection(connection);
```
