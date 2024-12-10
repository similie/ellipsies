# Ellipsies 🌌

_“Because sometimes… you just need to connect the dots.”_

Ellipsies is a NodeJS framework (with TypeScript superpowers) for building RESTful APIs that are as elegant as they are powerful. Whether you’re spinning up a quick service or architecting the backend of your dreams, Ellipsies is here to make your journey a smooth one.

Ellipsies is designed to empower developers in rapidly creating slim, efficient microservices with streamlined API development and CRUD operations, eliminating unnecessary complexity.

By leveraging Ellipsies, developers can efficiently construct microservices that align with modern architectural best practices, promoting agility and resilience in complex systems. At Similie, we using Ellipsies as the backbone of our early warning microservices.

Why Ellipsies? 🤔

* Express Yourself: Built on Express for that battle-tested, tried-and-true HTTP experience.
* Decorators FTW: Because code should look beautiful while being functional.
* Type Safe: With TypeScript at the core, you get the confidence of type safety.
* Opinionated Yet Flexible: We guide you, but hey, you’re the boss.
* Plug and Play: Easy-to-use connectors for your frontend apps.

## Installation 🚀

Install Ellipsies via npm or yarn:

```bash
npm install --save @similie/ellipsies
```

## Quickstart ⚡

Ellipsies makes it easy to get started. Follow the setup below, and you’ll have a working API faster than you can say “RESTful routes.”

## Preflight Check ✈️

Add the following to your tsconfig.json:

```
"emitDecoratorMetadata": true,
"experimentalDecorators": true
```

We need these to make those gorgeous decorators work their magic. ✨

## Application Setup 🏗️

Here’s how you bootstrap your Ellipsies app. Just a few lines of code, and voilà!

```typescript
import {
  Ellipsies,
  COMMON_API_SERVICE_ROUTES, // /api/v2/
  DEFAULT_SERVICE_PORT, // 1612 Similie uses this port as a microservice default
} from '@similie/ellipsies';
import * as models from './models';
import * as controllers from './controllers';

const ellipsies = new Ellipsies({
  models,
  controllers,
  port: DEFAULT_SERVICE_PORT,
  prefix: COMMON_API_SERVICE_ROUTES,
});

await ellipsies.setDataSource({
  database: 'postgres',
  username: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: 5432,
});

ellipsies.start();
console.log('Ellipsies is running... 🚀');
```

### Models 🛠️

Your data deserves the best representation. Here’s how to create a model:

```typescript
import {
  Entity,
  Index,
  Column,
  EllipsiesBaseModelUUID,
} from '@similie/ellipsies';

@Entity('user', { schema: 'public' })
export default class User extends EllipsiesBaseModelUUID {
  @Column('text', { name: 'username', unique: true })
  public userName: string;

  @Column('text', { name: 'email', unique: true })
  public email: string;

  // ... Add more fields as needed
}
```

_Pro Tip:_ Use our BaseModel or BaseModelUUID for auto-magical timestamps (createdAt, updatedAt) and unique identifiers.

We leverage [TypeORM](https://typeorm.io/) for robust database interaction. Dive into their docs to unleash the full potential.

## Controllers 🎮

Controllers are where the action happens. Define your routes like a pro:

```typescript
import { EllipsiesController, EllipsiesExtends } from '@similie/ellipsies';
import { User } from '../models';

@EllipsiesExtends('users')
export default class UserController extends EllipsiesController<User> {
  public constructor() {
    super(User);
  }
}
```

CRUD is now ready on your ApplicationUser model at the `/users` route. Feeling adventurous? Customize routes to your heart’s content:

```typescript
import {
  Get,
  UseBefore,
  QueryAgent,
  ExpressRequest,
  EllipsiesController,
  EllipsiesExtends,
} from '@similie/http-agent';
import { User } from '../models';

@EllipsiesExtends('users')
export default class UserController extends EllipsiesController<User> {
  /**
   * Create a custom route
   */
  @Get('/hello')
  public async sayHello() {
    return { message: 'Hello, World! 🌍' };
  }
  /**
   * @description Override defaults to validate query and get objects
   * @param {ExpressRequest} req
   * @returns {Promise<User[]>}
   */
  public override async find(req: ExpressRequest): Promise<User[]> {
    const query = await QueryAgent.validateQuery<User>(req);
    const agent = new QueryAgent<User>(User, query);
    return agent.getObjects();
  }
}
```

## Middleware & Extensions 🧩

Ellipsies plays nicely with middleware. Wrap your routes with authentication, validation, or whatever else you need:

```typescript
@UseBefore(YourCustomMiddleware.validate)
@Get('/secure-data')
public async secureRoute() {
  return { data: 'Top Secret 🤫' };
}
```

We use [Routing Controllers](https://github.com/typestack/routing-controllers#readme) backed by [Express](https://github.com/expressjs/express) to power the routes. Please refer to their comprehensive documentation to learn more.

For your frontend applications, you can use [Similie's HTTP Connectors](https://github.com/similie/http-connector) for seamless integration to your API.

## Licensing 📜

Ellipsies is MIT licensed, so you’re free to use, modify, and distribute it. Just remember us when you’re rich and famous. 💖

Ready to give Ellipsies a spin? Start connecting those dots today!

## About Similie

[Similie](https://similie.org) is a technology company based out of Timor-Leste, dedicated to developing innovative solutions that support international development initiatives and climate-change adaption. Our mission is to harness the power of technology to drive positive change and improve lives around the world. With a focus on sustainability, community engagement, and social impact, we strive to create products and services that make a real difference in people's lives.


## Contributors to Ellipsies

We extend our heartfelt gratitude to the following individuals for their invaluable contributions to the development and success of Ellipsies:
* Adam Smith: guernica0131
* Steve Golley: s-g-1

Your dedication and expertise have been instrumental in shaping Ellipsies into the robust framework it is today.

If you would like to join this list and contribute to Ellipsies, please refer to our CONTRIBUTING.md guide for more information on how to get involved.

Thank you for your continued support and contributions!
