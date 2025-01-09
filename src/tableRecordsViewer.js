import * as d3 from 'd3'
import DB from './database.js'

function createTableRecordsViewer(containerId = 'table-records', tableName) {
    // Clear any existing content
    const container = d3.select(`#${containerId}`)
    container.html('')
    
    console.log(containerId, tableName)
    if (!tableName) {
        container.html('<p>Please select a table to view records.</p>')
        return
    }

    // Immediately fetch and display records for the given table
    async function displayRecords() {
        try {
            if (!DB.isOpen()) {
                await DB.open()
            }

            const table = DB.table(tableName)
            const records = await table.toArray()

            // Create table header
            if (records.length > 0) {
                const columns = Object.keys(records[0])
                
                const table = container.append('table')
                    .attr('class', 'records-table')
                
                const thead = table.append('thead')
                const tbody = table.append('tbody')

                // Add header row
                thead.append('tr')
                    .selectAll('th')
                    .data(columns)
                    .enter()
                    .append('th')
                    .text(d => d)

                // Add data rows
                const rows = tbody.selectAll('tr')
                    .data(records)
                    .enter()
                    .append('tr')

                rows.selectAll('td')
                    .data(row => columns.map(column => row[column]))
                    .enter()
                    .append('td')
                    .text(d => d)
            } else {
                container.append('p')
                    .text(`No records found in table: ${tableName}`)
            }
        } catch (err) {
            console.error('Error fetching records:', err)
            container.html(`Error loading records for table: ${tableName}`)
        }
    }

    // Initialize the display
    displayRecords()
}

export default createTableRecordsViewer