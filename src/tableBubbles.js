import DB, {schema} from './database.js'
import * as d3 from 'd3'


function analyzeRelationships(schema) {
  const links = []
  const tables = Object.keys(schema)
  
  const getBaseTable = (fkName) => {
      if (fkName === 'realmId') return 'realms'
      if (fkName === 'memberId') return 'members'
      return fkName.replace('Id', 's')
  }
  
  tables.forEach(tableName => {
      const schemaStr = schema[tableName].replace(/[\[\]@]/g, '')
      const fields = schemaStr.split(',').map(f => f.trim())
      
      fields.forEach(field => {
          const parts = field.split('+')
          parts.forEach(part => {
              if (part.endsWith('Id')) {
                  const targetTable = getBaseTable(part)
                  
                  if (
                    targetTable !== tableName
                    && tables.includes(targetTable)
                  ) {
                      links.push({
                          source: tableName,
                          target: targetTable,
                          type: part,
                          id: `${tableName}-${targetTable}-${part}`
                      })
                  }
              }
          })
      })
  })
  
  return links
}


async function fetchData() {
    try {
        if (!DB.isOpen()) {
            await DB.open()
        }
        
        const tables = await DB.tables
        if (!tables || !tables.length) {
            console.warn('No tables found in database')
            return []
        }
        
        const filteredTables = tables.filter(table => !table.name.startsWith('$'))
        
        const data = await Promise.all(
            filteredTables.map(async (table) => {
                try {
                    const count = await table.count()
                    return {
                        tableName: table.name,
                        count: count
                    }
                } catch (err) {
                    console.error(`Error getting count for table ${table.name}:`, err)
                    return {
                        tableName: table.name,
                        count: 0
                    }
                }
            })
        )
        
        return data
    } catch (err) {
        console.error('Error fetching database data:', err)
        throw err
    }
}


function createTableBubbles(
  containerId = 'table-graph',
  options,
) {
    // Set default dimensions for the chart
    const width = options?.width || 600
    const height = options?.height || 400
    const padding = options?.padding || 2
    
    
    fetchData().then(data => {
        const svg = d3.select(`#${containerId}`)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            
        // Create links based on schema relationships
        const schemaLinks = analyzeRelationships(schema)
        const links = schemaLinks.filter(link => 
            data.some(d => d.tableName === link.source) && 
            data.some(d => d.tableName === link.target)
        )
        
        // Create a container group
        const bubbleGroup = svg.append("g")
            .attr("transform", `translate(${width/2},${height/2})`)
            
        // Add links first so they appear behind bubbles
        const linkElements = bubbleGroup.selectAll(".link")
            .data(links)
            .enter()
            .append("g")
            .attr("class", "link")

        // Add the main line for each relationship
        linkElements.append("line")
            .style("stroke", "#999")
            .style("stroke-opacity", 0.6)
            .style("stroke-width", 1)

        // Add tiny labels for the foreign key names
        linkElements.append("text")
            .attr("class", "link-label")
            .style("font-size", "10px")
            .style("fill", "#666")
            .text(d => d.type)

        // Scale for bubble size
        const radius = d3.scaleSqrt()
            .domain([0, d3.max(data, d => d.count)])
            .range([30, 80])

        // Create force simulation with both nodes and links
        const simulation = d3.forceSimulation(data)
            .force("link", d3.forceLink(links)
                .id(d => d.tableName)
                .distance(d => radius(d.source.count) + radius(d.target.count) + 50))
            .force("charge", d3.forceManyBody().strength(-200))
            .force("collide", d3.forceCollide().radius(d => radius(d.count) + padding))
            .force("center", d3.forceCenter(0, 0))
            .on("tick", ticked)

        // Create groups for each bubble and its text
        const bubbles = bubbleGroup.selectAll(".bubble")
            .data(data)
            .enter()
            .append("g")
            .attr("class", "bubble")

        // Add circles
        bubbles.append("circle")
            .attr("r", d => radius(d.count))
            .style("fill", "steelblue")
            .style("opacity", 0.7)

        // Add text
        bubbles.append("text")
            .style("text-anchor", "middle")
            .style("fill", "white")
            .style("font-size", d => Math.min(radius(d.count) * 0.4, 16) + "px")
            .each(function(d) {
                const text = d3.select(this)
                text.append("tspan")
                    .attr("x", 0)
                    .attr("dy", "-0.2em")
                    .text(d.tableName)
                text.append("tspan")
                    .attr("x", 0)
                    .attr("dy", "1.2em")
                    .text(d.count)
            })

        // Update positions on each tick of the simulation
        function ticked() {
            // Update the link lines
            linkElements.select("line")
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y)
                
            // Update the link labels
            linkElements.select("text")
                .attr("x", d => (d.source.x + d.target.x) / 2)
                .attr("y", d => (d.source.y + d.target.y) / 2)

            bubbles.attr("transform", d => `translate(${d.x},${d.y})`)
        }
    }).catch(error => {
        console.error("Error creating table bubbles:", error)
    })
}

export default createTableBubbles