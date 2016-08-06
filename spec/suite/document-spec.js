import co from 'co';
import { Schema, Document } from '../../src';

describe("Document", function() {

  describe(".constructor()", function() {

    it("loads the data", function() {

      var date = new Date('2014-10-26 00:25:15');

      var document = new Document({ data: {
        title: 'Hello',
        body: 'World',
        created: date
      }});

      expect(document.get('title')).toBe('Hello');
      expect(document.get('body')).toBe('World');
      expect(document.get('created')).toBe(date);

    });

  });

  describe(".model()", function() {

    it("returns the model class name", function() {

      var document = new Document();
      expect(document.model()).toBe(Document);

    });

  });

  describe(".parents()", function() {

    it("gets the parents", function() {

      var parent = new Document();
      var document = new Document();
      parent.set('value', document);
      expect(document.parents().has(parent)).toBe(true);
      expect(document.parents().get(parent)).toBe('value');

    });

  });

  describe(".removeParent()", function() {

    it("removes a parent", function() {

      var parent = new Document();
      var document = new Document();
      parent.set('value', document);
      parent.remove('value');
      expect(document.parents().has(parent)).toBe(false);

    });

  });

  describe(".basePath()", function() {

    it("returns the root path", function() {

      var document = new Document({ basePath: 'items' });
      expect(document.basePath()).toBe('items');

    });

  });

  describe(".get()", function() {

      it("gets a value", function() {

        var document = new Document();
        expect(document.set('title', 'Hello')).toBe(document);
        expect(document.get('title')).toBe('Hello');

      });

      it("gets a virtual value", function() {

        var schema = new Schema();
        schema.column('a', { type: 'string', virtual: true});

        var document = new Document({schema: schema});
        expect(document.set('a', 1)).toBe(document);
        expect(document.get('a')).toBe('1');

      });

      it("gets all values but virtuals", function() {

        var schema = new Schema();

        var document = new Document();

        expect(document.set({
          a: 1,
          b: 2,
          c: 3
        })).toBe(document);

        expect(document.get()).toEqual({
          a: 1,
          b: 2,
          c: 3
        });

      });

  });

  describe(".set()", function() {

    it("sets values", function() {

      var date = new Date('2014-10-26 00:25:15');

      var document = new Document();
      expect(document.set('title', 'Hello')).toBe(document);
      expect(document.set('body', 'World')).toBe(document);
      expect(document.set('created', date)).toBe(document);

      expect(document.get('title')).toBe('Hello');
      expect(document.get('body')).toBe('World');
      expect(document.get('created')).toBe(date);

    });

    it("sets nested arbitraty value in cascade", function() {

      var data = new Document();
      data.set('a.nested.value', 'hello');

      expect(data.data()).toEqual({
        a: {
          nested: {
            value: 'hello'
          }
        }
      });

    });

    it("returns `undefined` for undefined fields", function() {

      var document = new Document();
      expect(document.get('foo')).toBe(undefined);

    });

    it("sets an array of values", function() {

      var date = new Date('2014-10-26 00:25:15');

      var document = new Document();
      expect(document.set({
        title: 'Hello',
        body: 'World',
        created: date
      })).toBe(document);
      expect(document.get('title')).toBe('Hello');
      expect(document.get('body')).toBe('World');
      expect(document.get('created')).toBe(date);

    });

    it("returns all raw datas with no parameter", function() {

      var timestamp = 1446208769;

      var document = new Document({
        data: {
          title: 'Hello',
          body: 'World',
          created: timestamp
        }
      });
      expect(document.get()).toEqual({
        title: 'Hello',
        body: 'World',
        created: timestamp
      });

    });

    it("throws an exception if the field name is not valid", function() {

      var closure = function() {
        var document = new Document();
        document.get('');
      };
      expect(closure).toThrow(new Error("Field name can't be empty."));

    });

    it("emits modified events", function(done) {

      var document = new Document();
      var id;
      var events = 0;
      document.on('modified', function(model, uuid) {
        if (id === undefined || id === uuid) {
          events++;
          id = uuid;
        }
        if (events === 3) {
          done();
        }
      });

      document.set('a.nested.value', 'hello');

    });

  });

  describe(".has()", function() {

    it("returns `true` if a element has been setted", function() {

      var document = new Document();
      document.set('field1', 'foo');
      document.set('field2', null);

      expect(document.has('field1')).toBe(true);
      expect(document.has('field2')).toBe(true);

    });

    it("returns `true` if a element has been setted using a dotted notation", function() {

      var document = new Document();
      document.set('field1.field1', 'foo');
      document.set('field2.field2', null);

      expect(document.has('field1.field1')).toBe(true);
      expect(document.has('field2.field2')).toBe(true);

    });

    it("returns false if a element doesn't exist", function() {

      var document = new Document();
      expect(document.has('undefined')).toBe(false);

    });

  });

  describe(".remove()", function() {

    it("removes items", function() {

      var data = {
        id: 1,
        title: 'test record',
        body: 'test body',
        enabled: true
      };

      var document = new Document({ data: data });
      document.remove('body');
      document.remove('enabled');

      expect(document.data()).toEqual({
        id: 1,
        title: 'test record'
      });

    });

    it("removes items using a dotted notation", function() {

      var document = new Document();
      document.set('field1.field1', 'foo');
      document.set('field2.field2', null);
      document.remove('field1.field1');
      document.remove('field2.field2');

      expect(document.has('field1.field1')).toBe(false);
      expect(document.has('field2.field2')).toBe(false);

    });

  });

  describe(".persisted()", function() {

    it("returns persisted data", function() {

      var document = new Document({
        data: {
          id: 1,
          title: 'Hello',
          body: 'World'
        }
      });

      document.set({
        id: 1,
        title: 'Good Bye',
        body: 'Folks'
      });

      expect(document.persisted('title')).toBe('Hello');
      expect(document.persisted('body')).toBe('World');

      expect(document.get('title')).toBe('Good Bye');
      expect(document.get('body')).toBe('Folks');

      expect(document.modified('title')).toBe(true);
      expect(document.modified('body')).toBe(true);

    });

    it("returns all persisted data with no parameter", function() {

      var document = new Document({
        data: {
          id: 1,
          title: 'Hello',
          body: 'World'
        }
      });

      document.set({
        id: 1,
        title: 'Good Bye',
        body: 'Folks'
      });

      expect(document.persisted()).toEqual({
        id: 1,
        title: 'Hello',
        body: 'World'
      });

    });

  });

  describe(".modified()", function() {

    it("returns a boolean indicating if a field has been modified", function() {

      var document = new Document({
        data: {
          title: 'original'
        }
      });

      expect(document.modified('title')).toBe(false);

      document.set('title', 'modified');
      expect(document.modified('title')).toBe(true);

    });

    it("returns `false` if a field has been updated with a same scalar value", function() {

      var document = new Document({
        data: {
          title: 'original'
        }
      });

      expect(document.modified('title')).toBe(false);

      document.set('title', 'original');
      expect(document.modified('title')).toBe(false);

    });

    it("returns `false` if a field has been updated with a similar object value", function() {

      var document = new Document({
        data: {
          'body': {}
        }
      });

      expect(document.modified('body')).toBe(false);

      document.set('body', document.get('body'));
      expect(document.modified('body')).toBe(false);

    });

    it("delegates the job for values which has a `modified()` method", function() {

      var childDocument = new Document({
        data: {
          field: 'value'
        }
      });

      var document = new Document({
        data: {
          child: childDocument
        }
      });

      expect(document.modified()).toBe(false);

      document.get('child').set('field', 'modified');
      expect(document.modified()).toBe(true);

    });

    it("returns `true` when an unexisting field has been added", function() {

      var document = new Document();

      document.set('modified', 'modified');

      expect(document.modified()).toBe(true);

    });

    it("returns `true` when a field is removed", function() {

      var document = new Document({
        data: {
          title: 'original'
        }
      });

      expect(document.modified('title')).toBe(false);

      document.remove('title');
      expect(document.modified('title')).toBe(true);

    });

    it("returns `false` when an unexisting field is checked", function() {

      var document = new Document();
      expect(document.modified('unexisting')).toBe(false);

    });

  });

  describe(".to('array')", function() {

    it("exports into an array", function() {

      var data = {
        id: 1,
        title: 'test record'
      };

      var document = new Document({ data: data });
      expect(document.to('array')).toEqual(data);

    });

    it("exports nested relations", function() {

      var data = {
        name: 'amiga_1200.jpg',
        title: 'Amiga 1200',
        tags: [
          { name: 'tag1' }
        ]
      };

      var image = new Document({ data: data });
      expect(image.data()).toEqual(data);

    });

  });

});