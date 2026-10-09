
import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "";

const categories = [
  "All",
  "Electronics",
  "Mobiles",
  "Fashion",
  "Home",
  "Accessories",
];

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

function getCategory(product) {
  const value = String(product.category || "").toLowerCase();

  if (value.includes("mobile") || value.includes("phone")) return "Mobiles";
  if (value.includes("electronic") || value.includes("laptop")) return "Electronics";
  if (value.includes("fashion") || value.includes("cloth") || value.includes("shoe")) return "Fashion";
  if (value.includes("home") || value.includes("kitchen")) return "Home";
  if (value.includes("accessor")) return "Accessories";

  return product.category || "Other";
}

function ProductImage({ product }) {
  const [imageFailed, setImageFailed] = useState(false);

  const image = product.image;
  const category = getCategory(product).toLowerCase();

  const emoji = category.includes("mobile")
    ? "📱"
    : category.includes("electronic")
      ? "🎧"
      : category.includes("fashion")
        ? "👕"
        : category.includes("home")
          ? "🏠"
          : category.includes("accessor")
            ? "⌚"
            : "🛍️";

  if (image && !imageFailed) {
    return (
      <div className="product-image">
        <img
          src={image}
          alt={product.name}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="product-image image-placeholder">
      <span>{emoji}</span>
    </div>
  );
}

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        const response = await fetch(`${API_URL}/api/products`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Products API returned ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Invalid products API response");
        }

        setProducts(data);
        setError("");
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Product loading failed:", err);
          setError("Products load nahi ho paaye. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadProducts();
    return () => controller.abort();
  }, []);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query);

      const matchesCategory =
        activeCategory === "All" ||
        getCategory(product).toLowerCase() === activeCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, activeCategory]);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  const cartTotal = cart.reduce(
    (total, item) => total + Number(item.price) * item.quantity,
    0
  );

  function addToCart(product) {
    if (!product._id) {
      setNotice("Is product ki ID available nahi hai.");
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item._id === product._id);

      if (existing) {
        return current.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...current, { ...product, quantity: 1 }];
    });

    setNotice(`${product.name} cart mein add ho gaya.`);
    setCartOpen(true);
  }

  function changeQuantity(id, change) {
    setCart((current) =>
      current
        .map((item) =>
          item._id === id
            ? { ...item, quantity: item.quantity + change }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(id) {
    setCart((current) => current.filter((item) => item._id !== id));
  }

  function handleCheckout() {
    setNotice(
      "Cart ready hai. Razorpay checkout hum next step mein securely integrate karenge."
    );
  }

  return (
    <div className="app">
      <div className="top-strip">
        Welcome to SaurabKart — Smart shopping, great value!
      </div>

      <header className="navbar">
        <a className="logo" href="#" aria-label="SaurabKart home">
          <span className="logo-icon">S</span>
          <span>Saurab<span className="logo-accent">Kart</span></span>
        </a>

        <form
          className="search-box"
          onSubmit={(event) => event.preventDefault()}
        >
          <span className="search-icon">⌕</span>
          <input
            type="search"
            placeholder="Search mobiles, electronics, fashion..."
            aria-label="Search products"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
          <button className="search-submit" type="submit">Search</button>
        </form>

        <button
          className="header-action"
          type="button"
          onClick={() => setNotice("Login feature next phase mein add hoga.")}
        >
          <span>♙</span>
          <span>Account</span>
        </button>

        <button
          className="cart-action"
          type="button"
          onClick={() => setCartOpen(true)}
          aria-label={`Open cart, ${cartCount} items`}
        >
          <span className="cart-icon">🛒</span>
          <span>Cart</span>
          <span className="cart-count">{cartCount}</span>
        </button>
      </header>

      <nav className="category-nav" aria-label="Product categories">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={activeCategory === category ? "category active" : "category"}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </nav>

      <main>
        <section className="hero">
          <div className="hero-content">
            <span className="hero-label">YOUR EVERYDAY SHOPPING DESTINATION</span>
            <h1>Great deals.<br /><span>Better shopping.</span></h1>
            <p>Discover products you love at prices you'll love even more.</p>
            <button
              type="button"
              className="hero-button"
              onClick={() =>
                document.getElementById("products")?.scrollIntoView({
                  behavior: "smooth",
                })
              }
            >
              Explore products <span>→</span>
            </button>
            <div className="hero-benefits">
              <span>✓ Value for money</span>
              <span>✓ Easy shopping</span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-circle">
              <span className="hero-bag">🛍️</span>
              <span className="floating-item item-one">🎧</span>
              <span className="floating-item item-two">⌚</span>
              <span className="floating-item item-three">👟</span>
            </div>
            <div className="deal-bubble">SMART<br />DEALS</div>
          </div>
        </section>

        <section className="benefit-row">
          <div><span>🚚</span><div><strong>Convenient shopping</strong><small>Shop from anywhere</small></div></div>
          <div><span>💎</span><div><strong>Great value</strong><small>Find your favourites</small></div></div>
          <div><span>🔒</span><div><strong>Secure checkout</strong><small>Payment integration coming next</small></div></div>
        </section>

        <section className="products-section" id="products">
          <div className="section-heading">
            <div>
              <span className="eyebrow">HANDPICKED FOR YOU</span>
              <h2>{activeCategory === "All" ? "Popular Products" : activeCategory}</h2>
              <p>Explore our collection and find your next favourite.</p>
            </div>
            <span className="product-count">{filteredProducts.length} products</span>
          </div>

          {loading && <div className="status">Loading products...</div>}

          {!loading && error && (
            <div className="status error" role="alert">
              {error}
              <button onClick={() => window.location.reload()} type="button">
                Retry
              </button>
            </div>
          )}

          {!loading && !error && filteredProducts.length === 0 && (
            <div className="empty-state">
              <span>🔎</span>
              <h3>No products found</h3>
              <p>
                {products.length === 0
                  ? "Your product catalogue is empty. Add products to MongoDB first."
                  : "Try a different search or category."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setActiveCategory("All");
                }}
              >
                Show all products
              </button>
            </div>
          )}

          {!loading && !error && filteredProducts.length > 0 && (
            <div className="products">
              {filteredProducts.map((product) => (
                <article className="product-card" key={product._id}>
                  <ProductImage product={product} />
                  <div className="product-info">
                    <span className="product-category">{getCategory(product)}</span>
                    <h3 title={product.name}>{product.name}</h3>
                    <p className="product-description">
                      {product.description || "Discover this product at SaurabKart."}
                    </p>
                    <div className="product-price">{money(product.price)}</div>
                    <button
                      className="add-button"
                      type="button"
                      onClick={() => addToCart(product)}
                    >
                      <span>＋</span> Add to Cart
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <a className="logo footer-logo" href="#">
          <span className="logo-icon">S</span>
          <span>Saurab<span className="logo-accent">Kart</span></span>
        </a>
        <p>Your shopping destination. Built with React, Node.js, MongoDB and AWS.</p>
        <span>© {new Date().getFullYear()} SaurabKart</span>
      </footer>

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {cartOpen && (
        <div className="cart-overlay" onClick={() => setCartOpen(false)}>
          <aside
            className="cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cart-heading">
              <div>
                <span className="eyebrow">YOUR SHOPPING BAG</span>
                <h2>My Cart ({cartCount})</h2>
              </div>
              <button
                type="button"
                className="close-cart"
                onClick={() => setCartOpen(false)}
                aria-label="Close cart"
              >
                ×
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <span>🛒</span>
                <h3>Your cart is empty</h3>
                <p>Add products to start shopping.</p>
                <button type="button" onClick={() => setCartOpen(false)}>
                  Continue shopping
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div className="cart-item" key={item._id}>
                      <ProductImage product={item} />
                      <div className="cart-item-info">
                        <h3>{item.name}</h3>
                        <strong>{money(item.price)}</strong>
                        <div className="quantity-row">
                          <button
                            type="button"
                            onClick={() => changeQuantity(item._id, -1)}
                            aria-label={`Decrease ${item.name} quantity`}
                          >−</button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => changeQuantity(item._id, 1)}
                            aria-label={`Increase ${item.name} quantity`}
                          >＋</button>
                          <button
                            type="button"
                            className="remove-item"
                            onClick={() => removeFromCart(item._id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cart-summary">
                  <div><span>Subtotal</span><strong>{money(cartTotal)}</strong></div>
                  <div><span>Delivery</span><strong>Calculated at checkout</strong></div>
                  <div className="grand-total"><span>Total</span><strong>{money(cartTotal)}</strong></div>
                  <button
                    type="button"
                    className="checkout-button"
                    onClick={handleCheckout}
                  >
                    Proceed to Checkout →
                  </button>
                  <p className="checkout-note">
                    Payment is not enabled yet. We will connect Razorpay in the next phase.
                  </p>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

export default App;
