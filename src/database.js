import Dexie from "dexie"
import dexieCloud from "dexie-cloud-addon"
import settings from "./settings"


const DB = new Dexie('Testor', { addons: [dexieCloud] })


export const schema = {
  realms: '@realmId, name, createdAt, createdBy, status',
  members: '@id, name, realmId',
  roles: '[realmId+name]',
  
  data: '@memberId, stuff',
}


DB.version(1).stores(schema)


DB.cloud.configure({
  databaseUrl: settings.DB_URL,
  requireAuth: true,
  realms: true,
})


export default DB