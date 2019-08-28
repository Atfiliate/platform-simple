const mcache 	= require('memory-cache');
const http		= require('request-promise');

module.exports = {
    run: function(request, response) {
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
                        let tempModule = eval(`typeof ${moduleName} != 'undefined' && ${moduleName}`);
                        let module = {};
                            module[moduleName] = tempModule;
                        return module;
                    }
                    
                    try{
                        var componentMeta = mcache.get(id);
                        fs.readFile(`components/${id}`, 'utf8', (e,d)=>{
                            let code = d;
                            console.log('code from fs: ', url)
                            res(mod(code))
                        })
                    }catch(e){
                        http({url}).then(r=>{
                            let code = r;
                            fs.writeFile(`components/${id}`, code, (e)=>{
                                console.log('code from url: ', url)
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
            
            component._route = (route, fn)=>{
                let vars = {};
                let routeVars = route.split('/');
                let currentPath = '';
                let routeCheck = ()=>{
                    let newPath = request.originalUrl;
                    if(currentPath != newPath){
                        vars = {};
                        currentPath = newPath;
                        let pathVars = currentPath.split('/');
                        routeVars.forEach((v,i)=>{
                            let parts = v.split(/[\{,\}]+/);
                            if(parts[1])
                                vars[parts[1]] = pathVars[i]
                        })
                        fn(vars);
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
                            if(module[moduleName])
                                fn(module[moduleName], {resolve, reject})
                            else
                                reject(`Module ${moduleName} could not be loaded.`)
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
                                    component._wrap(html);
                                }else{
                                    res(html);
                                }
                            }
                        })
                    })
                })
            }
            component._on = (event, fn)=>{
                // the server does not do anything with this because there are no server interactions with the component.
                // we could possibly add an attribute to queue an event?
            }
            component._wrap = html=>{
                component._import('https://the.homeschool.express/project/import/component/wrapper.js', '_wrapper').then(module=>{
                    response.send(module['_wrapper'](html))
                })
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


        let app = new Component('MyApp', (app)=>{
            // app._import(['/project/import/component/modal.js', '/project/import/component/forms.js'])
            app._route('/{project}', ({project})=>{
                app.project = project;
                app._register(`page`, true).extends('Project', `https://the.homeschool.express/project/import/component/test-${project}.js`, (Project, promise)=>{
                    //we could potentially load user credentials, settings, preferences etc, and pass them into the project.
                    promise.resolve(new Project());
                })
            })
            
            app._setRender(async (components, render)=>{
                let page = await components[`page`]._render();
                render(`<div>
                    <h1>Page Header</h1>
                    <div>${page}</div>
                </div>`)
            })
        })
        app._render('body')
    }
}