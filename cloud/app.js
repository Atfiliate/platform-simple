function Component(name, fn){
    let component = this;
    component.name = name;
    let componentList = [];
    let componentMap = {};
    
    component._import = async function(url, moduleName){
        return new Promise((res,rej)=>{
            let id = url.split('/').join('_')
            var mkdir = require('mkdirp');
            var fs = require('fs');
            
            let mod = codeStr=>{
                let code = codeStr.split('export')[0];
                eval(code);
                let tempModule = eval(`${moduleName}`);
                let module = {};
                    module[moduleName] = tempModule;
                return module;
            }
            
            var componentMeta = mcache.get(id);
            if(componentMeta){
                fs.readFile(`components/${id}`, 'utf8', (e,d)=>{
                    let code = d;
                    console.log('code from fs',code)
                    res(mod(code))
                })
            }else{
                http({url}).then(r=>{
                    let code = r;
                    fs.writeFile(`components/${id}`, code, (e)=>{
                        if(e)
                            console.log(e)
                        else
                            mcache.put(id, 'loaded', 360000);
                        res(mod(code))
                    })
                })
            }
        })
    }
    
    component._route = (path, fn)=>{
        let currentRoute = '';
        let routeCheck = ()=>{
            let newRoute = 'p1'; //window.location.hash.replace('#', '');
            if(currentRoute != newRoute){
                currentRoute = newRoute;
                fn(currentRoute);
                component._render();
            }
        }
        routeCheck();
        // window.addEventListener('hashchange', e=>{
        // 	routeCheck()
        // })
        
    }
        
    component._register = (name, replaceOld)=>{
        let resolve, reject;
        let isReady = new Promise((res,rej)=>{
            resolve = res;
            reject = rej;
        });
        let newComponent = {name,isReady,resolve,reject};
        
        if(componentMap[name]){
            if(replaceOld){
                componentList.splice(componentList.indexOf(componentMap[name]), 1, newComponent);
                componentMap[name] = newComponent;
                
            }else{
                newComponent = componentMap[name];
            }
        }else{
            componentList.push(newComponent);
            componentMap[name] = newComponent;
        }
        
        return {
            get: ()=>{
                return newComponent.isReady
            },
            extends: (moduleName, moduleUrl, fn)=>{
                component._import(moduleUrl, moduleName).then(module=>{
                    fn(module[moduleName], {resolve, reject})
                })
            },
            should: (description)=>{
                newComponent.description = description;
            }
        }
    }
    
    component._components = ()=>{
        return new Promise((res,rej)=>{
            let components = {};
            Promise.all(componentList.map(c=>c.isReady)).then(cs=>{
                componentList.forEach((c,i)=>components[c.name] = cs[i]);
                res(components)
            })
        })
    }
    
    component._setRender = (renderFn)=>{
        component.renderFn = renderFn;
    }
    
    component._render = (selector)=>{
        if(selector)
            component.selector = selector;
        
        return new Promise((res,rej)=>{
            component._components().then(components=>{
                component.renderFn(components, html=>{
                    if(typeof document != 'undefined' && component.selector){
                        if(document.querySelector(component.selector)){
                            document.querySelector(component.selector).innerHTML = html;
                        }
                        res(html);
                    }else{
                        if(selector){
                            response.send(component._wrap(html));
                        }else{
                            res(html);
                        }
                    }
                })
            })
        })
    }
    component._wrap = html=>{
        return `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Cloud Render - Import Test</title>
                    <meta charset="UTF-8">
                    <script type="module" src="https://the.homeschool.express/project/import/component/test-root.js"></script>
                </head>
                <body>${html}</body>
            </html>
        `
    }
    
    
    /*
        The component module should enable pass-through routing, rendering, importing.
        An entire app should be able to be built with vanilla JS wrapped in components.
        This library should be super small and simple.  It should wrap some basic
        functions to enable server and browser rendering.  
        An addon component should enable feature flags and trafic splitting.
    */
    
    fn(this);
}

module.exports = {Component};