// durable.js 


export default {
  async fetch(request, env, ctx) {
    const id = env.MY_DURABLE_OBJECT.idFromName(new URL(request.url).pathname);

    const stub = env.MY_DURABLE_OBJECT.get(id);

    const greeting = await stub.sayHello();

    return new Response(greeting);
  },
};








/// write controller here to add the notification into the durable object