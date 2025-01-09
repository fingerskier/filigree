import createTableBubbles from './tableGraph.js'
import createTableRecordsViewer from './tableRecordsViewer.js'
import * as d3 from 'd3'


// Initialize the table bubbles visualization
createTableBubbles('table-graph', {
  height: 400,
  width: 600,
})


// Listen for state changes
d3.select(window).on('state', (event) => {
  console.log('State change:', event)
  const { context, query } = event.detail
  
  // Check if we have a context that includes a table name
  if (context) {
    if (context[0] === 'table') {
      console.log('State change:', context, query)
      
      const tableName = context[1]
      // Initialize or update the records viewer with the selected table
      createTableRecordsViewer('table-records', tableName)
    }
  }
})