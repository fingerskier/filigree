/*
This module sets up a listener for hashchange and popstate events.
The URL hash gets parsed into an array from one/two to ['one', 'two']; or just 'one' if there is no slash.
The query params get parsed into an object.
These values are pushed via D3 custom events.
*/
import * as d3 from 'd3'


const handleHashChange = event=>{
  let path = location.hash.slice(1).split('/')
  let params = location.search.slice(1).split('&')
  
  let query = {}
  
  params?.forEach(Q=>{
    let [key, value] = Q.split('=')
    query[key] = value
  })
  
  const context = path
  
  const payload = {context, query}
  
  d3.select(window).dispatch('state', {detail: payload})
}


window.addEventListener('load', event=>{
  handleHashChange()
  
  window.addEventListener('hashchange', handleHashChange)
  window.addEventListener('popstate', handleHashChange)
})


window.addEventListener('unload', event=>{
  window.removeEventListener('hashchange', handleHashChange)
  window.removeEventListener('popstate', handleHashChange)
})