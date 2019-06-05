module.exports = function() {

  var elementUtilities, cy;

  function jsonToSif(param) {
    elementUtilities = param.elementUtilities;
    cy = param.sbgnCyInstance.getCy();
  }

  jsonToSif.convert = function() {
    var lines = [];

    var edges = cy.edges();
    //FUNDA: any edge can be a sif edge
//     .filter( function( edge ) {
//       return elementUtilities.isSIFEdge( edge )
//         && elementUtilities.isSIFNode( edge.source() )
//         && elementUtilities.isSIFNode( edge.target() );
//     } );

    var nodes = cy.nodes().filter( function( node ) {
      return elementUtilities.isSIFNode( node );
    } );

    nodes = nodes.not( edges.connectedNodes() );

    var setToStr = function(set) {
      if (!set) {
        return '';
      }

      return Object.keys(set).join(';');
    };

    var getLabel = function(node) {
      return node.data('label');
    };

    edges.forEach( function( edge ) {
      var srcName = getLabel( edge.source() );
      var tgtName = getLabel( edge.target() );

      if ( !srcName || !tgtName ) {
        return;
      }

      var type = edge.data('class');
      var pcIDSet = edge.data('pcIDSet');
      var siteLocSet = edge.data('siteLocSet');
      var pcIDs = setToStr( pcIDSet );
      var siteLocations = setToStr( siteLocSet );

      var line = [ srcName, type, tgtName, pcIDs, siteLocations ].join( '\t' );
      lines.push( line );
    } );

    nodes.forEach( function( node ) {
      var label = getLabel( node );

      if ( label ) {
        lines.push( label );
      }
    } );

    var text = lines.join( '\n' );
    return text;
  };

  return jsonToSif;
};
