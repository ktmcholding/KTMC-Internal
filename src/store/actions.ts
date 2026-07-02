import type {
  AppState,
  CalendarEvent,
  Client,
  ClientDocument,
  CallRecord,
  CuratorIntegrationConfig,
  DocFolder,
  EmailExample,
  Employee,
  InternalDocument,
  Invoice,
  Lead,
  QuoIntegrationConfig,
  Role,
  SaleRecord,
  Task,
} from "../types";

export type Action =
  | { type: "HYDRATE"; state: AppState }
  | { type: "ADD_SALE"; sale: SaleRecord }
  | { type: "DELETE_SALE"; id: string }
  | { type: "ADD_LEAD"; lead: Lead }
  | { type: "UPDATE_LEAD"; lead: Lead }
  | { type: "DELETE_LEAD"; id: string }
  | { type: "ADD_INVOICE"; invoice: Invoice }
  | { type: "UPDATE_INVOICE"; invoice: Invoice }
  | { type: "DELETE_INVOICE"; id: string }
  | { type: "ADD_CLIENT"; client: Client }
  | { type: "UPDATE_CLIENT"; client: Client }
  | { type: "DELETE_CLIENT"; id: string }
  | { type: "ADD_CLIENT_DOCUMENTS"; clientId: string; documents: ClientDocument[] }
  | {
      type: "DELETE_CLIENT_DOCUMENT";
      clientId: string;
      documentId: string;
      path?: string;
    }
  | { type: "ADD_TASK"; task: Task }
  | { type: "UPDATE_TASK"; task: Task }
  | { type: "DELETE_TASK"; id: string }
  | { type: "ADD_EVENT"; event: CalendarEvent }
  | { type: "DELETE_EVENT"; id: string }
  | { type: "ADD_INTERNAL_DOCS"; documents: InternalDocument[] }
  | { type: "DELETE_INTERNAL_DOC"; id: string; path?: string }
  | { type: "MOVE_INTERNAL_DOC"; id: string; folder: string }
  | { type: "SET_DOC_FOLDERS"; folders: DocFolder[] }
  | { type: "SET_CLIENT_DOC_SECTIONS"; sections: DocFolder[] }
  | { type: "ADD_EMPLOYEE"; employee: Employee }
  | { type: "UPDATE_EMPLOYEE"; employee: Employee }
  | { type: "DELETE_EMPLOYEE"; id: string }
  | { type: "SET_ROLES"; roles: Role[] }
  | { type: "ADD_CALL"; call: CallRecord }
  | { type: "DELETE_CALL"; id: string }
  | { type: "SET_EMAIL_EXAMPLES"; examples: EmailExample[] }
  | { type: "SET_QUO"; config: QuoIntegrationConfig }
  | { type: "SET_CURATOR"; config: CuratorIntegrationConfig }
  | { type: "RESET" };
