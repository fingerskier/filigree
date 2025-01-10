import createTableGraph from './tableGraph.js'
import recordsViewer from './tableRecords.js'
import createRecordEditor from './recordEditor.js'
import * as d3 from 'd3'


const tableRecords = document.getElementById('table-records')
const recordEditor = document.getElementById('record-editor')


// Initialize the table bubbles visualization
createTableGraph('table-graph', {
  height: 400,
  width: 600,
})


// Listen for state changes
d3.select(window).on('state', (event) => {
  const { context, query } = event.detail
  
  // Check if we have a context that includes a table name
  if (context) {
    if (context[0] === 'table') {
      tableRecords.style.display = 'inline-block'
      recordEditor.style.display = 'none'

      
      const tableName = context[1]
      // Initialize or update the records viewer with the selected table
      recordsViewer('table-records', tableName)
    }
    
    if (context[0] === 'record') {
      tableRecords.style.display = 'none'
      recordEditor.style.display = 'inline-block'
      
      const tableName = context[1]
      
      createRecordEditor('record-editor', tableName, query)
    }
  }
})