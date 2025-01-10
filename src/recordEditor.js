import * as d3 from 'd3'
import DB, { schema } from './database.js'


function getFieldsFromSchema(tableName) {
  const schemaStr = schema[tableName]
  if (!schemaStr) return []
  
  return schemaStr
    .replace(/[\[\]@]/g, '')  
    .split(',')               
    .flatMap(field => field.trim().split('+'))
    .map(field => field.trim())
}


export default function createRecordEditor(
  containerId = 'record-editor',
  tableName,
  options = {}
) {
  if (!tableName) {
    console.error('Table name is required for record editor')
    return
  }
  
  let popupContainer = document.getElementById(containerId)
  if (!popupContainer) {
    popupContainer = document.createElement('div')
    popupContainer.id = containerId
    document.body.appendChild(popupContainer)
  }
  
  const container = d3.select('#' + containerId)
  container.selectAll('*').remove()
  
  const form = container
    .append('form')
    .attr('class', 'record-editor-form')
  
  const fields = getFieldsFromSchema(tableName)
  let currentRecord = null

  // Enhanced loadRecord function that updates form values
  async function loadRecord(recordId) {
    try {
      if (!DB.isOpen()) {
        await DB.open()
      }
      
      const table = DB.table(tableName)
      const record = await table.get(recordId)
      
      if (record) {
        currentRecord = record // Store the current record
        
        // Update all form fields with record data
        Object.entries(record).forEach(([key, value]) => {
          const input = form.select(`[name="${key}"]`)
          if (!input.empty()) {
            input.property('value', value || '')
          } else if (fields.includes(key)) {
            // Field exists in schema but not in form - create it
            const fieldGroup = form.append('div')
              .attr('class', 'field-group')
            
            fieldGroup.append('label')
              .attr('for', key)
              .text(key)
            
            fieldGroup.append('input')
              .attr('type', 'text')
              .attr('id', key)
              .attr('name', key)
              .property('value', value || '')
          }
        })

        // Create any remaining fields from schema that weren't in the record
        fields.forEach(field => {
          if (!form.select(`[name="${field}"]`).node()) {
            const fieldGroup = form.append('div')
              .attr('class', 'field-group')
            
            fieldGroup.append('label')
              .attr('for', field)
              .text(field)
            
            fieldGroup.append('input')
              .attr('type', 'text')
              .attr('id', field)
              .attr('name', field)
              .property('value', '')
          }
        })
      }
      
      return record
    } catch (err) {
      console.error('Error loading record:', err)
      return null
    }
  }
  
  async function saveRecord(data) {
    try {
      if (!DB.isOpen()) {
        await DB.open()
      }
      
      const table = DB.table(tableName)
      const recordToSave = {
        ...currentRecord, // Preserve existing record data
        ...data // Merge with new form data
      }

      // If we have an ID, update existing record
      if (recordToSave.id || recordToSave['@id']) {
        await table.update(recordToSave.id || recordToSave['@id'], recordToSave)
      } else {
        // Otherwise create new record
        await table.add(recordToSave)
      }
      
      container.style('display', 'none')
      return true
    } catch (err) {
      console.error('Error saving record:', err)
      return false
    }
  }
  
  // Create initial form fields based on schema
  fields.forEach(field => {
    const fieldGroup = form.append('div')
      .attr('class', 'field-group')
    
    fieldGroup.append('label')
      .attr('for', field)
      .text(field)
    
    fieldGroup.append('input')
      .attr('type', 'text')
      .attr('id', field)
      .attr('name', field)
  })
  
  // Load record data if ID is provided
  if (options.recordId) {
    loadRecord(options.recordId)
  }
  
  const buttonContainer = form.append('div')
    .attr('class', 'button-container')
    .style('display', 'flex')
    .style('gap', '10px')
    .style('margin-top', '20px')
  
  buttonContainer.append('button')
    .attr('type', 'submit')
    .attr('class', 'save-button')
    .text('Save')
  
  buttonContainer.append('button')
    .attr('type', 'button')
    .attr('class', 'cancel-button')
    .text('Cancel')
    .on('click', () => {
      container.style('display', 'none')
    })
  
  form.on('submit', async function(event) {
    event.preventDefault()
    
    const formData = {}
    fields.forEach(field => {
      const input = form.select(`[name="${field}"]`)
      if (!input.empty()) {
        formData[field] = input.property('value')
      }
    })
    
    const success = await saveRecord(formData)
    if (success) {
      const event = new CustomEvent('recordSaved', {
        detail: { tableName, record: formData }
      })
      window.dispatchEvent(event)
    }
  })
  
  container.style('display', 'block')
  
  return {
    loadRecord,
    saveRecord,
    hide: () => container.style('display', 'none')
  }
}