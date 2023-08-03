# executed after each test
teardown_suite() {
    # Remove user identities.
    dfx identity remove user1
    dfx identity remove user2
    dfx identity remove user3

    # Stops the local canister execution environment processes
    dfx stop
}
