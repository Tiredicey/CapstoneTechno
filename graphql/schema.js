export const schema = `
  type Product {
    id: ID!
    name: String!
    category: String!
    subcategory: String
    description: String
    basePrice: Float!
    images: [String]
    tags: [String]
    inventory: Int
    rating: Float
    reviewCount: Int
    customizable: Boolean
  }

  type Order {
    id: ID!
    status: String!
    items: String
    deliveryDate: String
    pricing: String
    createdAt: String
  }

  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
    loyaltyPoints: Int
    language: String
  }

  type Analytics {
    totalOrders: Int
    totalRevenue: Float
    topProducts: [Product]
    conversionRate: Float
    avgOrderValue: Float
  }

  type Query {
    products(category: String, search: String, limit: Int, offset: Int): [Product]
    product(id: ID!): Product
    orders(status: String, limit: Int): [Order]
    analytics: Analytics
  }

  type Mutation {
    updateOrderStatus(id: ID!, status: String!): Order
    applyPromo(code: String!, cartId: String!): Boolean
  }
`;