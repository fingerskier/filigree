import * as d3 from 'd3'
import DB, { schema } from './database.js'

// Helper function to get fields from schema
function getFieldsFromSchema(tableName) {
  const schemaStr = schema[tableName]
  if (!schemaStr) return []
  
  return schemaStr
    .replace(/[\[\]@]/g, '')  // Remove special characters
    .split(',')               // Split into individual fields
    .flatMap(field => field.trim().split('+'))  // Handle compound keys
    .map(field => field.trim())
    .filter(field => !field.startsWith('@'))  // Filter out auto-generated fields
}

// Build query string from record data
function buildQueryString(record) {
  const params = []
  
  // Only add parameters that exist
  if (record.id) params.push(`id=${record.id}`)
  if (record['@id']) params.push(`id=${record['@id']}`)
  if (record.realmId) params.push(`realmId=${record.realmId}`)
  if (record.name) params.push(`name=${record.name}`)
  
  return params.length ? `?${params.join('&')}` : ''
}

function recordsViewer(containerId = 'table-records', tableName) {
  // Get container and ensure it exists
  const container = d3.select(`#${containerId}`)
  if (!container.node()) {
    console.error(`Container #${containerId} not found`)
    return
  }
  
  // Remove ALL existing content, including any previously created lists
  container.selectAll('*').remove()
  
  console.log(containerId, tableName)
  if (!tableName) {
    container.html('<p>Please select a table to view records.</p>')
    return
  }
  
  // Add "New Record" button
  const addButton = container.append('button')
    .attr('class', 'add-record-button')
    .text('Add New Record')
    .style('margin-bottom', '10px')
    .on('click', () => showAddRecordForm())
    
  // Create a container for the add record form
  const formContainer = container.append('div')
    .attr('class', 'add-record-form')
    .style('display', 'none')
  
  // Function to fetch options for foreign key fields
  async function getForeignKeyOptions(fieldName) {
    try {
      const targetTable = fieldName.replace('Id', 's')  // Convert memberId to members
      const table = DB.table(targetTable)
      const records = await table.toArray()
      return records.map(record => ({
        id: record.id || record['@id'],
        name: record.name || record.id || record['@id']
      }))
    } catch (err) {
      console.error(`Error fetching options for ${fieldName}:`, err)
      return []
    }
  }
  
  // Function to show the add record form
  async function showAddRecordForm() {
    formContainer.style('display', 'block')
    formContainer.selectAll('*').remove()
    
    const form = formContainer.append('form')
    const fields = getFieldsFromSchema(tableName)
    
    // Create form fields based on schema
    for (const field of fields) {
      const fieldGroup = form.append('div')
        .attr('class', 'field-group')
        .style('margin', '10px 0')
      
      fieldGroup.append('label')
        .attr('for', field)
        .text(field)
        .style('display', 'block')
      
      if (field.endsWith('Id')) {
        // Create select for foreign key fields
        const select = fieldGroup.append('select')
          .attr('id', field)
          .attr('name', field)
          .style('display', 'block')
          .style('width', '100%')
        
        const options = await getForeignKeyOptions(field)
        
        select.append('option')
          .attr('value', '')
          .text('Select...')
        
        select.selectAll('option.item')
          .data(options)
          .enter()
          .append('option')
          .attr('value', d => d.id)
          .text(d => d.name)
      } else {
        // Create regular input for non-foreign key fields
        fieldGroup.append('input')
          .attr('type', 'text')
          .attr('id', field)
          .attr('name', field)
          .style('display', 'block')
          .style('width', '100%')
      }
    }
    
    // Add form buttons
    const buttonGroup = form.append('div')
      .style('margin-top', '20px')
      .style('display', 'flex')
      .style('gap', '10px')
    
    buttonGroup.append('button')
      .attr('type', 'submit')
      .text('Save')
    
    buttonGroup.append('button')
      .attr('type', 'button')
      .text('Cancel')
      .on('click', () => formContainer.style('display', 'none'))
    
    // Handle form submission
    form.on('submit', async function(event) {
      event.preventDefault()
      const formData = {}
      
      fields.forEach(field => {
        const input = form.select(`[name="${field}"]`)
        if (!input.empty()) {
          formData[field] = input.property('value')
        }
      })
      
      try {
        const table = DB.table(tableName)
        await table.add(formData)
        formContainer.style('display', 'none')
        displayRecords()  // Refresh the records list
      } catch (err) {
        console.error('Error saving record:', err)
        alert('Error saving record. Please try again.')
      }
    })
  }
  
  // Immediately fetch and display records for the given table
  async function displayRecords() {
    try {
      if (!DB.isOpen()) {
        await DB.open()
      }
      
      const table = DB.table(tableName)
      const records = await table.toArray()
      
      // Clear existing records but keep the Add Record button and form
      const recordsContainer = container.selectAll('.records-container').empty() ?
        container.append('div').attr('class', 'records-container') :
        container.select('.records-container')
      
      recordsContainer.selectAll('*').remove()
      
      if (records.length > 0) {
        const list = recordsContainer.append('ul')
          .attr('class', 'records-list')
        
        // Add list items for each record
        const items = list.selectAll('li')
          .data(records)
          .enter()
          .append('li')
        
        items.append('a')
          .attr('href', d => `${buildQueryString(d)}#record/${tableName}`)
          .text(d => d.name || 'Unnamed Record')
          .attr('class', 'record-link')
      } else {
        recordsContainer.append('p')
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

export default recordsViewer