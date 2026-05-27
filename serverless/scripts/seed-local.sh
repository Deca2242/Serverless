#!/usr/bin/env bash
set -e

ENDPOINT="${AWS_ENDPOINT_URL:-http://localhost:4566}"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"
TABLE="MercadoGlobal"

AWS_CMD="aws --endpoint-url $ENDPOINT --region $REGION"

echo "Waiting for DynamoDB table '$TABLE' to be active..."
for i in $(seq 1 30); do
  STATUS=$($AWS_CMD dynamodb describe-table --table-name "$TABLE" \
    --query "Table.TableStatus" --output text 2>/dev/null || echo "MISSING")
  if [ "$STATUS" = "ACTIVE" ]; then
    echo "Table is ACTIVE."
    break
  fi
  echo "  Status: $STATUS — retrying ($i/30)..."
  sleep 2
done

ORDER_ID_1="ORD-555"
ORDER_ID_2="ORD-600"

# --- Usuarios demo ---

echo "Seeding user: usr-luisa-001..."

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "USER#usr-luisa-001"},
  "SK": {"S": "#PROFILE"},
  "name": {"S": "Luisa Fernanda"},
  "email": {"S": "luisa@example.com"}
}'

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "USER#usr-luisa-001"},
  "SK": {"S": "ADDRESS#addr-001"},
  "street": {"S": "Calle 123 # 45-67"},
  "city": {"S": "Bogota"}
}'

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "USER#usr-luisa-001"},
  "SK": {"S": "PAYMENT#pay-001"},
  "type": {"S": "credit"},
  "last4": {"S": "4242"}
}'

echo "Seeding user: usr-jgarcia-001 (mockup EcoCart)..."

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "USER#usr-jgarcia-001"},
  "SK": {"S": "#PROFILE"},
  "name": {"S": "Juan Garcia"},
  "email": {"S": "jgarcia@example.com"}
}'

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "USER#usr-jgarcia-001"},
  "SK": {"S": "ADDRESS#addr-jgarcia-001"},
  "street": {"S": "Calle 100 # 12 - 34, Apto 501"},
  "city": {"S": "Bogota, Colombia"}
}'

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "USER#usr-jgarcia-001"},
  "SK": {"S": "PAYMENT#pay-jgarcia-001"},
  "type": {"S": "credit"},
  "last4": {"S": "4242"}
}'

# --- Catálogo EcoCart ---

echo "Seeding EcoCart categories..."

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "CATEGORY#electronica"},
  "SK": {"S": "#METADATA"},
  "name": {"S": "Electronica"}
}'

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "CATEGORY#ropa"},
  "SK": {"S": "#METADATA"},
  "name": {"S": "Ropa"}
}'

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "CATEGORY#hogar"},
  "SK": {"S": "#METADATA"},
  "name": {"S": "Hogar"}
}'

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "CATEGORY#deportes"},
  "SK": {"S": "#METADATA"},
  "name": {"S": "Deportes"}
}'

echo "Seeding EcoCart products..."

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "PRODUCT#telefono-x100"},
  "SK": {"S": "#METADATA"},
  "name": {"S": "Telefono Inteligente X100"},
  "price": {"N": "850000"},
  "description": {"S": "Smartphone de ultima generacion con pantalla AMOLED"},
  "imageUrl": {"S": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop"},
  "categorySlug": {"S": "electronica"},
  "GSI1PK": {"S": "CATEGORY#electronica"},
  "GSI1SK": {"S": "PRODUCT#Telefono Inteligente X100"}
}'

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "PRODUCT#telefono-x100"},
  "SK": {"S": "#STOCK"},
  "qty": {"N": "15"}
}'

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "PRODUCT#portatil-workpro-15"},
  "SK": {"S": "#METADATA"},
  "name": {"S": "Portatil WorkPro 15"},
  "price": {"N": "3200000"},
  "description": {"S": "Laptop profesional 15 pulgadas, 16GB RAM"},
  "imageUrl": {"S": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop"},
  "categorySlug": {"S": "electronica"},
  "GSI1PK": {"S": "CATEGORY#electronica"},
  "GSI1SK": {"S": "PRODUCT#Portatil WorkPro 15"}
}'

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "PRODUCT#portatil-workpro-15"},
  "SK": {"S": "#STOCK"},
  "qty": {"N": "8"}
}'

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "PRODUCT#auriculares-z5"},
  "SK": {"S": "#METADATA"},
  "name": {"S": "Audifonos Bluetooth Z5"},
  "price": {"N": "420000"},
  "description": {"S": "Audifonos inalambricos con cancelacion de ruido"},
  "imageUrl": {"S": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop"},
  "categorySlug": {"S": "electronica"},
  "GSI1PK": {"S": "CATEGORY#electronica"},
  "GSI1SK": {"S": "PRODUCT#Audifonos Bluetooth Z5"}
}'

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "PRODUCT#auriculares-z5"},
  "SK": {"S": "#STOCK"},
  "qty": {"N": "25"}
}'

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "PRODUCT#smartwatch-fittrack"},
  "SK": {"S": "#METADATA"},
  "name": {"S": "Smartwatch FitTrack"},
  "price": {"N": "650000"},
  "description": {"S": "Reloj inteligente con monitor de actividad y salud"},
  "imageUrl": {"S": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop"},
  "categorySlug": {"S": "electronica"},
  "GSI1PK": {"S": "CATEGORY#electronica"},
  "GSI1SK": {"S": "PRODUCT#Smartwatch FitTrack"}
}'

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "PRODUCT#smartwatch-fittrack"},
  "SK": {"S": "#STOCK"},
  "qty": {"N": "12"}
}'

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "PRODUCT#mochila-viaje"},
  "SK": {"S": "#METADATA"},
  "name": {"S": "Mochila de Viaje"},
  "price": {"N": "180000"},
  "description": {"S": "Mochila resistente al agua, 40L capacidad"},
  "imageUrl": {"S": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop"},
  "categorySlug": {"S": "deportes"},
  "GSI1PK": {"S": "CATEGORY#deportes"},
  "GSI1SK": {"S": "PRODUCT#Mochila de Viaje"}
}'

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "PRODUCT#mochila-viaje"},
  "SK": {"S": "#STOCK"},
  "qty": {"N": "20"}
}'

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "PRODUCT#camiseta-algodon-hombre"},
  "SK": {"S": "#METADATA"},
  "name": {"S": "Camiseta Algodon Hombre"},
  "price": {"N": "89000"},
  "description": {"S": "Camiseta 100% algodon, corte regular"},
  "imageUrl": {"S": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop"},
  "categorySlug": {"S": "ropa"},
  "GSI1PK": {"S": "CATEGORY#ropa"},
  "GSI1SK": {"S": "PRODUCT#Camiseta Algodon Hombre"}
}'

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "PRODUCT#camiseta-algodon-hombre"},
  "SK": {"S": "#STOCK"},
  "qty": {"N": "30"}
}'

# --- Pedidos demo (Luisa) ---

echo "Seeding order $ORDER_ID_1 (delivered)..."

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "ORDER#ORD-555"},
  "SK": {"S": "#METADATA"},
  "userId": {"S": "USER#usr-luisa-001"},
  "status": {"S": "delivered"},
  "total": {"N": "150000"},
  "date": {"S": "2026-04-10T10:00:00Z"},
  "shippingAddress": {"S": "Calle 123 # 45-67, Bogota"}
}'

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "USER#usr-luisa-001"},
  "SK": {"S": "ORDER#2026-04-10T10:00:00Z#ORD-555"},
  "orderId": {"S": "ORD-555"},
  "status": {"S": "delivered"},
  "total": {"N": "150000"},
  "shippingAddress": {"S": "Calle 123 # 45-67, Bogota"},
  "GSI1PK": {"S": "USER#usr-luisa-001#STATUS#delivered"},
  "GSI1SK": {"S": "2026-04-10T10:00:00Z"}
}'

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "ORDER#ORD-555"},
  "SK": {"S": "ITEM#camiseta-polo"},
  "productName": {"S": "Camiseta Algodon Hombre"},
  "qty": {"N": "2"},
  "unitPrice": {"N": "45000"},
  "subtotal": {"N": "90000"}
}'

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "ORDER#ORD-555"},
  "SK": {"S": "ITEM#pantalon-cargo"},
  "productName": {"S": "Pantalon Cargo Beige"},
  "qty": {"N": "1"},
  "unitPrice": {"N": "60000"},
  "subtotal": {"N": "60000"}
}'

echo "Seeding order $ORDER_ID_2 (shipped)..."

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "ORDER#ORD-600"},
  "SK": {"S": "#METADATA"},
  "userId": {"S": "USER#usr-luisa-001"},
  "status": {"S": "shipped"},
  "total": {"N": "850000"},
  "date": {"S": "2026-04-20T15:00:00Z"},
  "shippingAddress": {"S": "Calle 123 # 45-67, Bogota"}
}'

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "USER#usr-luisa-001"},
  "SK": {"S": "ORDER#2026-04-20T15:00:00Z#ORD-600"},
  "orderId": {"S": "ORD-600"},
  "status": {"S": "shipped"},
  "total": {"N": "850000"},
  "shippingAddress": {"S": "Calle 123 # 45-67, Bogota"},
  "GSI1PK": {"S": "USER#usr-luisa-001#STATUS#shipped"},
  "GSI1SK": {"S": "2026-04-20T15:00:00Z"}
}'

$AWS_CMD dynamodb put-item --table-name "$TABLE" --item '{
  "PK": {"S": "ORDER#ORD-600"},
  "SK": {"S": "ITEM#telefono-x100"},
  "productName": {"S": "Telefono Inteligente X100"},
  "qty": {"N": "1"},
  "unitPrice": {"N": "850000"},
  "subtotal": {"N": "850000"}
}'

echo ""
echo "Seed completado."
echo "  Usuarios: usr-luisa-001 (Luisa Fernanda), usr-jgarcia-001 (Juan Garcia / jgarcia)"
echo "  Categorias EcoCart: electronica, ropa, hogar, deportes"
echo "  Productos: telefono-x100, portatil-workpro-15, auriculares-z5,"
echo "             smartwatch-fittrack, mochila-viaje, camiseta-algodon-hombre"
echo "  Ordenes (Luisa): ORD-555 (delivered), ORD-600 (shipped)"
