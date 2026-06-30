import fs from 'node:fs/promises';
import path from 'node:path';

const RAW_DIR = 'data/raw';

const ARTICLES = [
  {
    name: 'article_react_hooks_guide.html',
    title: 'Understanding React Hooks: A Deep Dive into useEffect and state',
    content: `
      <h1>Understanding React Hooks: A Deep Dive into useEffect and state</h1>
      <p>React hooks were introduced in version 16.8 to allow developers to use state and other React features without writing a class. The most commonly used hooks are useState and useEffect.</p>
      <p>The useState hook returns a stateful value and a function to update it. During the initial render, the returned state is the same as the value passed as the first argument.</p>
      <p>The useEffect hook lets you perform side effects in function components. It serves the same purpose as componentDidMount, componentDidUpdate, and componentWillUnmount in React classes.</p>
      <h2>Managing Dependency Arrays in useEffect</h2>
      <p>If you want to run an effect and clean it up only once, you can pass an empty array as a second argument. This tells React that your effect doesn't depend on any values from props or state.</p>
      <p>However, you must be careful: if your effect uses variables from the outer scope, you must include them in the dependency array to avoid stale closures. Stale closures occur when a function captures variables that have since changed.</p>
    `
  },
  {
    name: 'article_terraform_best_practices.html',
    title: 'Terraform Best Practices: Managing State and Providers Securely',
    content: `
      <h1>Terraform Best Practices: Managing State and Providers Securely</h1>
      <p>Terraform is an open-source infrastructure as code software tool created by HashiCorp. It enables users to define and provision a datacenter infrastructure using a high-level configuration language known as HashiCorp Configuration Language.</p>
      <p>Managing state files securely is the most critical aspect of running Terraform in production. The state file contains a complete mapping of your resources, including sensitive credentials and secrets.</p>
      <h2>Locking and Remote Backends</h2>
      <p>You should always use a remote backend that supports state locking, such as AWS S3 with DynamoDB, or Google Cloud Storage. State locking prevents concurrent executions from corrupting your state files.</p>
      <p>Additionally, you should isolate environments using workspaces or separate directories. Never share a single state file between staging and production environments.</p>
    `
  },
  {
    name: 'article_swiftui_state_management.html',
    title: 'SwiftUI State Management: State, Binding, and ObservedObject Explained',
    content: `
      <h1>SwiftUI State Management: State, Binding, and ObservedObject Explained</h1>
      <p>SwiftUI offers a declarative approach to user interface design on Apple platforms. Managing state flows in a declarative framework requires a solid understanding of property wrappers like @State, @Binding, and @ObservedObject.</p>
      <p>Use @State for simple, private values that are owned by a single view. The view manages the storage and lifecycle of that state automatically.</p>
      <h2>Passing State to Child Views with @Binding</h2>
      <p>When a child view needs to read and write a value owned by a parent view, use @Binding. This creates a two-way connection, allowing changes in the child to update the parent state instantly.</p>
      <p>For more complex external data models, use @ObservedObject or @StateObject. These connect your views to classes that conform to the ObservableObject protocol, enabling reactive updates when properties change.</p>
    `
  },
  {
    name: 'article_typescript_generics.html',
    title: 'Mastering TypeScript Generics: Designing Reusable Type-Safe APIs',
    content: `
      <h1>Mastering TypeScript Generics: Designing Reusable Type-Safe APIs</h1>
      <p>TypeScript generics allow you to write reusable, flexible code that works with a variety of types rather than a single one. This is crucial for building large-scale, maintainable applications.</p>
      <p>A generic type is declared using angle brackets, like T. This acts as a placeholder parameter that is resolved when the function or class is instantiated.</p>
      <h2>Constraints and Utility Types</h2>
      <p>You can enforce constraints on generic parameters using the extends keyword. For example, T extends { id: string } ensures that the generic argument always possesses an id property.</p>
      <p>TypeScript also provides built-in utility types like Record, Pick, and Omit, which leverage generics under the hood to transform existing types dynamically.</p>
    `
  },
  {
    name: 'article_python_asyncio_guide.html',
    title: 'Introduction to asyncio in Python: Concurrency and Event Loops',
    content: `
      <h1>Introduction to asyncio in Python: Concurrency and Event Loops</h1>
      <p>Python's asyncio module is library to write concurrent code using the async/await syntax. It is used as a foundation for multiple asynchronous frameworks that provide high-performance network and web server connections.</p>
      <p>At the core of asyncio is the event loop, which manages and distributes the execution of different tasks. Tasks are wrapped coroutines that run concurrently.</p>
      <h2>Coroutines and Awaiting Futures</h2>
      <p>You define a coroutine using the async def syntax. Inside a coroutine, you use await to yield control back to the event loop while waiting for an external network response or database query.</p>
      <p>This cooperative multitasking model is highly efficient for I/O-bound operations, allowing a single thread to handle thousands of concurrent client sessions.</p>
    `
  },
  {
    name: 'article_nextjs_app_router.html',
    title: 'Next.js App Router: Dynamic Routing, Layouts, and Server Components',
    content: `
      <h1>Next.js App Router: Dynamic Routing, Layouts, and Server Components</h1>
      <p>The Next.js App Router introduces a new routing model built on React Server Components. It supports nested layouts, local loading states, and error boundary wrappers out of the box.</p>
      <p>By default, components inside the app directory are React Server Components. They are rendered on the server, reducing the JavaScript bundle size shipped to the client.</p>
      <h2>Client Components and Interactivity</h2>
      <p>If you need interactive elements (like useState, useEffect, or event listeners), you must declare the component as a Client Component by placing the "use client" directive at the top of the file.</p>
      <p>Nested layouts preserve state across page transitions, preventing expensive re-renders and improving the perceived performance of your web application.</p>
    `
  },
  {
    name: 'article_rest_vs_graphql.html',
    title: 'REST vs GraphQL: Architectural Tradeoffs in Web API Design',
    content: `
      <h1>REST vs GraphQL: Architectural Tradeoffs in Web API Design</h1>
      <p>Choosing between REST and GraphQL is a major architectural decision for modern web application developers. Both protocols have distinct strengths and operational costs.</p>
      <p>REST APIs expose structured endpoints for specific resources. They rely on standard HTTP methods like GET, POST, PUT, and DELETE, making them easy to cache at the CDN level.</p>
      <h2>Solving Over-fetching with GraphQL</h2>
      <p>GraphQL allows clients to request exactly the fields they need, preventing the over-fetching of data. Clients write structured queries that define the response payload shape.</p>
      <p>However, GraphQL queries can be complex to secure and cache compared to REST. Overly complex queries can strain database resources if not properly rate-limited or monitored.</p>
    `
  },
  {
    name: 'article_docker_containerization.html',
    title: 'Docker Containerization: Building Lightweight and Isolated Environments',
    content: `
      <h1>Docker Containerization: Building Lightweight and Isolated Environments</h1>
      <p>Docker is a platform for developing, shipping, and running applications inside isolated environments called containers. Containers package all code, runtimes, system tools, and settings needed to run an application.</p>
      <p>A Dockerfile is a text document that contains all the commands a user could call on the command line to assemble an image.</p>
      <h2>Optimizing Docker Image Size</h2>
      <p>To reduce container startup latency, you should minimize the size of your images. Use multi-stage builds to compile your application in a build container, then copy only the compiled binary to a lightweight runtime image.</p>
      <p>Additionally, take advantage of layer caching by copying dependencies first, running install commands, and copying source files last. This prevents reinstalling libraries when source files change.</p>
    `
  },
  {
    name: 'article_git_rebase_vs_merge.html',
    title: 'Git Rebase vs Merge: Maintaining a Clean Repository Commit History',
    content: `
      <h1>Git Rebase vs Merge: Maintaining a Clean Repository Commit History</h1>
      <p>Git offers two primary strategies for integrating changes from one branch into another: merging and rebasing. Understanding the trade-offs is key to team collaboration.</p>
      <p>Merging creates a new commit that joins the histories of both branches. It preserves the complete chronological history of commits, including all branch forks and joins.</p>
      <h2>Keeping History Linear with Rebasing</h2>
      <p>Rebasing moves the entire branch to begin at the tip of the target branch. This rewrites the project history by creating brand new commits for each commit in the original branch.</p>
      <p>Rebasing results in a clean, linear commit history that is easy to follow. However, you should never rebase commits that have been pushed to a public repository, as it disrupts other developers' work.</p>
    `
  },
  {
    name: 'article_postgresql_indexing.html',
    title: 'PostgreSQL Indexing: Optimizing Query Performance with B-Trees',
    content: `
      <h1>PostgreSQL Indexing: Optimizing Query Performance with B-Trees</h1>
      <p>Indexes are a powerful tool to speed up database queries in PostgreSQL. The default index type is the B-Tree, which is optimized for sorting and range queries.</p>
      <p>When you create an index, PostgreSQL builds a balanced tree structure that allows it to locate rows in logarithmic time instead of performing a sequential scan.</p>
      <h2>Composite Indexes and Query Planner</h2>
      <p>If you query on multiple columns frequently, you should create a composite index. Order matters: place the columns used in equality constraints first, followed by range conditions.</p>
      <p>Always analyze your query plan using the EXPLAIN ANALYZE command. This shows whether the database planner is using your index or falling back to a full table scan.</p>
    `
  }
];

async function generate() {
  console.log(`🚀 Generating ${ARTICLES.length} mock technical articles...`);
  for (const article of ARTICLES) {
    const filename = article.name;
    const filePath = path.join(RAW_DIR, filename);
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${article.title}</title>
      </head>
      <body>
        <article class="tech-article">
          ${article.content}
        </article>
      </body>
      </html>
    `;
    await fs.writeFile(filePath, html.trim(), 'utf-8');
    console.log(`✅ Generated: ${filename}`);
  }
  console.log('💎 Done! Technical articles injected.');
}

generate().catch(console.error);
