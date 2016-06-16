import co from 'co';
import { Document } from '../../src';

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

  describe(".parent()", function() {

    it("sets a parent", function() {

      var parent = {};
      var document = new Document();
      document.parent(parent);
      expect(document.parent()).toBe(parent);

    });

    it("returns the parent", function() {

      var parent = {};
      var document = new Document({ parent: parent });
      expect(document.parent()).toBe(parent);

    });

  });

  describe(".basePath()", function() {

    it("returns the root path", function() {

      var document = new Document({ basePath: 'items' });
      expect(document.basePath()).toBe('items');

    });

  });

  describe(".get()/.set()", function() {

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

    it("returns `null` for undefined fields", function() {

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

  });

  describe(".isset()", function() {

    it("returns `true` if a element has been setted", function() {

      var document = new Document();
      document.set('field1', 'foo');
      document.set('field2', null);

      expect(document.isset('field1')).toBe(true);
      expect(document.isset('field2')).toBe(true);

    });

    it("returns `true` if a element has been setted using a dotted notation", function() {

      var document = new Document();
      document.set('field1.field1', 'foo');
      document.set('field2.field2', null);

      expect(document.isset('field1.field1')).toBe(true);
      expect(document.isset('field2.field2')).toBe(true);

    });

    it("returns false if a element doesn't exist", function() {

      var document = new Document();
      expect(document.isset('undefined')).toBe(false);

    });

  });

  describe(".unset()", function() {

    it("unsets items", function() {

      var data = {
        id: 1,
        title: 'test record',
        body: 'test body',
        enabled: true
      };

      var document = new Document({ data: data });
      document.unset('body');
      document.unset('enabled');

      expect(document.data()).toEqual({
        id: 1,
        title: 'test record'
      });

    });

    it("unsets items using a dotted notation", function() {

      var document = new Document();
      document.set('field1.field1', 'foo');
      document.set('field2.field2', null);
      document.unset('field1.field1');
      document.unset('field2.field2');

      expect(document.isset('field1.field1')).toBe(false);
      expect(document.isset('field2.field2')).toBe(false);

    });

  });

  describe(".persisted()", function() {

    it("returns persisted data", function() {

      var document = new Document({
        data: {
          id: 1,
          title: 'Hello',
          body: 'World'
        },
        exists: true
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
        },
        exists: true
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
        },
        exists: true
      });

      expect(document.modified('title')).toBe(false);

      document.set('title', 'modified');
      expect(document.modified('title')).toBe(true);

    });

    it("returns `false` if a field has been updated with a same scalar value", function() {

      var document = new Document({
        data: {
          title: 'original'
        },
        exists: true
      });

      expect(document.modified('title')).toBe(false);

      document.set('title', 'original');
      expect(document.modified('title')).toBe(false);

    });

    it("returns `false` if a field has been updated with a similar object value", function() {

      var document = new Document({
        data: {
          'body': {}
        },
        exists: true
      });

      expect(document.modified('body')).toBe(false);

      document.set('body', document.get('body'));
      expect(document.modified('body')).toBe(false);

    });

    it("delegates the job for values which has a `modified()` method", function() {

      var childDocument = new Document({
        data: {
          field: 'value'
        },
        exists: true
      });

      var document = new Document({
        data: {
          child: childDocument
        },
        exists: true
      });

      expect(document.modified()).toBe(false);

      document.get('child').set('field', 'modified');
      expect(document.modified()).toBe(true);

    });

    it("returns `true` when an unexisting field has been added", function() {

      var document = new Document({ exists: true });

      document.set('modified', 'modified');

      expect(document.modified()).toBe(true);

    });

    it("returns `true` when a field is removed", function() {

      var document = new Document({
        data: {
          title: 'original'
        },
        exists: true
      });

      expect(document.modified('title')).toBe(false);

      document.unset('title');
      expect(document.modified('title')).toBe(true);

    });

    it("returns `false` when an unexisting field is checked", function() {

      var document = new Document({ exists: true });
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