import createTableBubbles from './tableGraph.js'
import createTableRecordsViewer from './tableRecordsViewer.js'
import * as d3 from 'd3'


const tableRecords = document.getElementById('table-records')

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
    console.log('Context:', context)
    if (context[0] === 'table') {
      tableRecords.style.display = 'inline-block'
      
      const tableName = context[1]
      // Initialize or update the records viewer with the selected table
      createTableRecordsViewer('table-records', tableName)
    } else {
      tableRecords.style.display = 'none'
    }
  }
})