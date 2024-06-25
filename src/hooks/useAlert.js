import React from 'react'
import { useState } from 'react'

const useAlert = () => {
    const  [alert, setalert] = useState({show:'false',text:'',type:'danger'})

    const showAlert=(text, type='danger')=>({
        show: 'true',
        text,
        type 

    })
    const hideAlert=()=>setAlert ({
        show: 'false',
        text:'',
        type:'danger'
    })
  return { alert,showAlert,hideAlert}
}

export default useAlert