import { Button, Field, Form, Toast, Dialog, Popup, Picker, PasswordInput, Collapse, CollapseItem } from 'vant'

export default function registerVant(app) {
  app.use(Button)
  app.use(Field)
  app.use(Form)
  app.use(Toast)
  app.use(Dialog)
  app.use(Popup)
  app.use(Picker)
  app.use(PasswordInput)
  app.use(Collapse)
  app.use(CollapseItem)
}
