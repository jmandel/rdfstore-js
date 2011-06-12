var RDFJSInterface = require("./../src/rdf_js_interface").RDFJSInterface;
var QueryEngine = require("./../src/query_engine").QueryEngine;
var QuadBackend = require("./../../js-rdf-persistence/src/quad_backend").QuadBackend;
var Lexicon = require("./../../js-rdf-persistence/src/lexicon").Lexicon;

exports.testFilters = function(test) {

    new Lexicon.Lexicon(function(lexicon){
        new QuadBackend.QuadBackend({treeOrder: 2}, function(backend){
            var engine = new QueryEngine.QueryEngine({backend: backend,
                                                      lexicon: lexicon});      
            var query = 'PREFIX foaf: <http://xmlns.com/foaf/0.1/>\
                         PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\
                         PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\
                         PREFIX : <http://example.org/people/>\
                         INSERT DATA {\
                         :alice\
                             rdf:type        foaf:Person ;\
                             foaf:name       "Alice" ;\
                             foaf:mbox       <mailto:alice@work> ;\
                             foaf:knows      :bob ;\
                             .\
                         :bob\
                             rdf:type        foaf:Person ;\
                             foaf:name       "Bob" ; \
                             foaf:knows      :alice ;\
                             foaf:mbox       <mailto:bob@work> ;\
                             foaf:mbox       <mailto:bob@home> ;\
                             .\
                         }';
            engine.execute(query, function(success, result){
                engine.execute('PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\
                                PREFIX  foaf:       <http://xmlns.com/foaf/0.1/>\
                                CONSTRUCT { ?s ?p ?o . }\
                                WHERE {\
                                  ?s ?p ?o .\
                                }', function(success, graph){
                                    test.ok(success === true);

                                    var rdf = RDFJSInterface.rdf;

                                    var results = graph.filter( rdf.filters.describes("http://example.org/people/alice") );

                                    var resultsCount = results.toArray().length;

                                    var resultsSubject = results.filter(rdf.filters.s("http://example.org/people/alice"))
                                    var resultsObject  = results.filter(rdf.filters.o("http://example.org/people/alice"))

                                    test.ok(resultsObject.toArray().length === 1);
                                    test.ok((resultsObject.toArray().length + resultsSubject.toArray().length) === resultsCount);


                                    // filter the graph to find all subjects with an "rdf:type" of "foaf:Person"
                                    var filter = rdf.filters.type(rdf.resolve("foaf:Person"));
                                    results = graph.filter( filter );
                                    var people = [];
                                    results.forEach( function(t) {
                                        // iterate over the results, creating a filtered graph for each subject found
                                        // and pass that graph to a display function
                                        people.push(graph.filter( rdf.filters.s(t.subject) ) );
                                    });

                                    test.ok(people.length === 2);
                                    test.done();
               });
            });
        });
    });
};


exports.testActions = function(test) {
    var rdf = RDFJSInterface.rdf;    
    var graph = rdf.createGraph();
    graph.addAction(rdf.createAction(rdf.filters.p(rdf.resolve("foaf:name")),
                                     function(triple){ var name = triple.object.valueOf();
                                                       var name = name.slice(0,1).toUpperCase() + name.slice(1, name.length);
                                                       triple.object = rdf.createNamedNode(name);
                                                       return triple;}));

    rdf.setPrefix("ex", "http://example.org/people/");
    graph.add(rdf.createTriple( rdf.createNamedNode(rdf.resolve("ex:Alice")),
                                rdf.createNamedNode(rdf.resolve("foaf:name")),
                                rdf.createLiteral("alice") ));;

    graph.add(rdf.createTriple( rdf.createNamedNode(rdf.resolve("ex:Alice")),
                                rdf.createNamedNode(rdf.resolve("foaf:knows")),
                                rdf.createNamedNode(rdf.resolve("ex:Bob")) ));;

    var triples = graph.match(null, rdf.createNamedNode(rdf.resolve("foaf:name")), null).toArray();
    test.ok(triples.length === 1);
    test.ok(triples[0].object.valueOf() === "Alice");

    var triples = graph.match(null, rdf.createNamedNode(rdf.resolve("foaf:knows")), null).toArray();
 
    test.ok(triples.length === 1);
    test.ok(triples[0].object.valueOf() === "http://example.org/people/Bob");
    
    test.done();
};