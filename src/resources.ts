export type Field = { key: string; label: string; type?: string; required?: boolean; options?: string[]; optionLabels?: Record<string,string>; source?: string; hint?: string; default?: unknown }
export type Resource = { model: string; singular: string; fields: Field[]; columns: { key: string; label: string; type?: string; width?: number }[] }
const name = { key: 'name', label: '名称', required: true }
const description = { key: 'description', label: '描述', type: 'textarea' }
const json = (key: string, label: string, hint = '', value: unknown = {}) => ({ key, label, type: 'json', hint, default: value })
export const resources: Record<string, Resource> = {
  projects: { model: 'project', singular: '项目', fields: [name, description, { key: 'members', label: '项目成员', type: 'multiple', source: 'users' }],
    columns: [{ key:'name', label:'项目名称' }, { key:'description', label:'描述' }, { key:'owner_name', label:'负责人' }, { key:'environment_count', label:'环境数', width:90 }, { key:'endpoint_count', label:'接口数', width:90 }, { key:'case_count', label:'用例数', width:90 }] },
  endpoints: { model:'endpoint', singular:'接口', fields: [name, {key:'function_name',label:'代码调用方法名',required:true,hint:'保存后 Python 可用 client.get_device_detail(...) 调用；使用小写字母、数字和下划线'},
    { key:'method', label:'请求方法', type:'select', options:['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'], default:'GET' },
    { key:'path', label:'请求路径', required:true, hint:'例如 /api/devices；系统地址自动使用当前项目环境配置' },
    { key:'body_type', label:'请求格式', type:'select', options:['json','form','text'], default:'json' },
    {key:'use_auth',label:'使用环境认证 Token',type:'switch',default:true},
    json('headers','请求头'), json('query','Query 参数'), json('body','请求体'), description],
    columns:[{key:'name',label:'接口名称'},{key:'function_name',label:'代码方法名'},{key:'method',label:'方法',type:'method',width:100},{key:'path',label:'请求路径'}] },
  cases: { model:'testcase', singular:'用例', fields:[name,
    { key:'endpoint',label:'关联接口',type:'select',source:'endpoints',required:true },
    { key:'priority',label:'优先级',type:'select',options:['P0','P1','P2','P3'],default:'P1' },
    { key:'author',label:'作者' },{key:'enabled',label:'启用',type:'switch',default:true},description,
    json('request_overrides','请求覆盖','覆盖 headers / query / body / path；使用 {{变量名}} 引用环境变量'),
    json('assertions','断言规则','source: status/json/text/header/duration；operator: eq/ne/contains/exists/lt/gt', [{source:'status',operator:'eq',expected:200}]),
    json('extract','提取变量','例如 {"device_id":"$.data.device.id"}'),json('tags','标签','字符串数组',[])],
    columns:[{key:'name',label:'用例名称'},{key:'kind',label:'类型',width:85},{key:'priority',label:'优先级',type:'priority',width:90},{key:'endpoint_name',label:'关联接口'},{key:'author',label:'作者',width:110},{key:'enabled',label:'状态',type:'boolean',width:90}] },
  suites: {model:'suite',singular:'套件',fields:[name,description,{key:'case_ids',label:'测试用例（按选择顺序执行）',type:'multiple',source:'cases',required:true},{key:'stop_on_failure',label:'失败后停止',type:'switch',default:false}],
    columns:[{key:'name',label:'套件名称'},{key:'description',label:'描述'},{key:'case_ids',label:'用例数',type:'count',width:100},{key:'stop_on_failure',label:'失败停止',type:'boolean',width:110}]},
  environments: {model:'environment',singular:'环境信息',fields:[name,{key:'code',label:'环境标识',required:true,hint:'例如 test、staging、production'},
    {key:'systems',label:'系统配置',type:'systems',hint:'一个环境可配置用户中心、IoT、场景等多个系统，每个 system_key 全局对应同一系统。'},
    json('personal_variables','我的环境变量','仅当前账号可见并随账号使用，不会影响其他账号。'),
    {key:'connections',label:'基础设施连接',type:'connections',hint:'支持多套 MySQL、PostgreSQL、Redis 和 MQTT；密码加密存储，读取时不回显。'}],
    columns:[{key:'name',label:'环境名称'},{key:'code',label:'标识',width:110},{key:'systems',label:'系统数',type:'count',width:90},{key:'connection_summary',label:'基础设施',type:'connection_summary'},{key:'personal_variables',label:'我的环境变量',type:'json-summary'}]},
  users: {model:'user',singular:'用户',fields:[{key:'username',label:'用户名',required:true},{key:'display_name',label:'显示名称'},{key:'email',label:'邮箱'},{key:'password',label:'密码',type:'password',hint:'创建时必填，编辑留空则不修改密码'},{key:'groups',label:'角色',type:'multiple',source:'roles'},{key:'is_active',label:'启用账号',type:'switch',default:true}],
    columns:[{key:'username',label:'用户名'},{key:'display_name',label:'显示名称'},{key:'email',label:'邮箱'},{key:'role_names',label:'角色',type:'join'},{key:'is_active',label:'账号状态',type:'boolean',width:100}]},
  roles: {model:'group',singular:'角色',fields:[name,{key:'permissions',label:'权限配置',type:'permissions'}],
    columns:[{key:'name',label:'角色名称'},{key:'permissions',label:'权限数量',type:'count'},{key:'member_count',label:'成员数量',width:110}]},
  runs: {model:'testrun',singular:'执行记录',fields:[],columns:[{key:'name',label:'执行名称'},{key:'status',label:'状态',type:'status',width:105},{key:'environment_name',label:'环境'},{key:'total',label:'总数',width:70},{key:'passed',label:'通过',width:70},{key:'failed',label:'失败',width:70},{key:'created_at',label:'开始时间',type:'date',width:170}]},
  'audit-logs': {model:'auditlog',singular:'审计',fields:[],columns:[{key:'actor_name',label:'操作人'},{key:'action',label:'操作'},{key:'resource',label:'资源'},{key:'object_id',label:'资源 ID'},{key:'created_at',label:'时间',type:'date',width:180}]},
}
