import CreateSale from "./CreateSale";

export default function CreateOrder({ navigate }) {
  return <CreateSale navigate={navigate} mode="order" />;
}
