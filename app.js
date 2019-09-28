const Koa = require('koa');
const Router = require('koa-router');
const OSS = require('ali-oss');
const serve = require('koa-static-server');
const STS = OSS.STS;

const app = new Koa();

const router = new Router();


const conf = {
    // 需要一个子帐号有 AliyunSTSAssumeRoleAccess 权限
    AccessKeyId: '',
    AccessKeySecret: '',
    // 打开 https://ram.console.aliyun.com/roles 创建一个角色拥有 AliyunOSSFullAccess(可以选择必要的操作) 权限
    RoleArn: '',
    host: '',
    region: '',
    bucket: ''
};

const sts = new STS({
    accessKeyId: conf.AccessKeyId,
    accessKeySecret: conf.AccessKeySecret
});



router.post('/api/sts', async (ctx, next) => {
    const body = ctx.query;
    const key = body.key;
    // 定义权限限制不允许访问其它文件对象
    const policy = {
        Version: '1',
        Statement: [
            {
                Action: 'oss:*',
                Effect: 'Allow',
                Resource: `acs:oss:*:*:${conf.bucket}/${key}`
            }
        ]
    };

    const token = await sts.assumeRole(conf.RoleArn, policy, 3600);
    ctx.body = {
        action: `//${conf.host}`,
        region: conf.region,
        accessKeyId: token.credentials.AccessKeyId,
        accessKeySecret: token.credentials.AccessKeySecret,
        stsToken: token.credentials.SecurityToken,
        bucket: conf.bucket,
        key,
    };
});

app.use(serve({rootDir: './'}));

app
  .use(router.routes())
  .use(router.allowedMethods());


module.exports = app;

if(require.main === module) {
    app.listen(8000, '0.0.0.0', () => {
        console.log('open: http://localhost:8000');
    });
}

